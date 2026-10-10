import { ORPCError, os, ValidationError } from "@orpc/server";
import { z } from "zod";

import { InputValidationFailed } from "@/server/errors";
import type { ValidationIssue } from "@/server/errors";

function isZodIssue(issue: object): issue is z.core.$ZodIssue {
  return "code" in issue;
}

function toIssues(issues: z.core.$ZodIssue[]): ValidationIssue[] {
  return issues.map(({ code, message, path }) => ({
    code,
    message,
    path: path.map((key) => (typeof key === "symbol" ? String(key) : key)),
  }));
}

export const inputValidation = os
  .errors({ [InputValidationFailed.code]: InputValidationFailed })
  .middleware(async ({ next }) => {
    try {
      return await next();
    } catch (error) {
      if (
        !(error instanceof ORPCError) ||
        error.code !== "BAD_REQUEST" ||
        !(error.cause instanceof ValidationError)
      ) {
        throw error;
      }

      const zodError = new z.ZodError(error.cause.issues.filter(isZodIssue));

      throw new InputValidationFailed({
        cause: error,
        data: { issues: toIssues(zodError.issues) },
        message: z.prettifyError(zodError),
      });
    }
  });
