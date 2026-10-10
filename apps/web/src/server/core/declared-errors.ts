import { ORPCError, os, reconcileORPCError } from "@orpc/server";
import type { AnyProcedure, ErrorMap } from "@orpc/server";
import type {
  StandardHandlerInterceptor,
  StandardHandlerPlugin,
} from "@orpc/server/standard";

import { BadRequest, InternalServerError } from "@/server/errors";
import type { Context } from "@/server/orpc";

function isErrorMap(value: unknown): value is ErrorMap {
  return typeof value === "object" && value !== null;
}

function declaredErrorMap(procedure: AnyProcedure) {
  const definition: unknown = procedure["~orpc"];
  const errorMap: unknown =
    isErrorMap(definition) && "errorMap" in definition
      ? definition.errorMap
      : undefined;

  return isErrorMap(errorMap) ? errorMap : {};
}

function isDeclared(errorMap: ErrorMap, error: unknown) {
  if (!(error instanceof ORPCError)) {
    return false;
  }

  const code: unknown = error.code;

  return typeof code === "string" && Object.hasOwn(errorMap, code);
}

async function toDeclaredError(
  procedure: AnyProcedure,
  error: unknown,
  path: readonly string[]
) {
  const errorMap = declaredErrorMap(procedure);

  if (error instanceof ORPCError && isDeclared(errorMap, error)) {
    return await reconcileORPCError(errorMap, error);
  }

  console.error(`[orpc] ${path.join(".")} failed`, error);

  return await reconcileORPCError(
    errorMap,
    new InternalServerError({ cause: error })
  );
}

// Procedure level

export const declaredErrorsOnly = os.middleware(
  async ({ next, path, procedure }) => {
    try {
      return await next();
    } catch (error) {
      throw await toDeclaredError(procedure, error, path);
    }
  }
);

// Handler level

async function declaredErrorBoundary(
  options: Parameters<StandardHandlerInterceptor<Context>>[0]
) {
  const { decodeInput, path, procedure } = options;

  async function decodeOrBadRequest() {
    try {
      return await decodeInput();
    } catch (error) {
      throw new BadRequest({ cause: error });
    }
  }

  try {
    return await options.next({ ...options, decodeInput: decodeOrBadRequest });
  } catch (error) {
    throw await toDeclaredError(procedure, error, path);
  }
}

export function declaredErrorsPlugin(): StandardHandlerPlugin<Context> {
  return {
    init: (options) => ({
      ...options,
      interceptors: [declaredErrorBoundary, ...(options.interceptors ?? [])],
    }),
    name: "declared-errors",
  };
}
