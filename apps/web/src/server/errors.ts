import { COMMON_ERROR_STATUS_MAP } from "@orpc/client";
import { error } from "@orpc/server";
import type { ORPCErrorFactory, ORPCErrorFactoryOptions } from "@orpc/server";
import { z } from "zod";

export type StandardErrorCode = Exclude<
  keyof typeof COMMON_ERROR_STATUS_MAP,
  "BAD_GATEWAY" | "CLIENT_CLOSED_REQUEST" | "GATEWAY_TIMEOUT"
>;

export type HttpErrorStatus =
  | 400
  | 401
  | 402
  | 403
  | 404
  | 405
  | 406
  | 408
  | 409
  | 410
  | 411
  | 412
  | 413
  | 415
  | 422
  | 428
  | 429
  | 500
  | 501
  | 503;

export const ERROR_STATUSES: Record<string, number> = {
  ...COMMON_ERROR_STATUS_MAP,
};

export function defineError<TCode extends StandardErrorCode, TData = unknown>(
  code: TCode,
  options: ORPCErrorFactoryOptions<TData>
): ORPCErrorFactory<TCode, TData>;
export function defineError<TCode extends Uppercase<string>, TData = unknown>(
  code: Exclude<TCode, StandardErrorCode>,
  options: ORPCErrorFactoryOptions<TData> & { status: HttpErrorStatus }
): ORPCErrorFactory<TCode, TData>;
export function defineError<TCode extends string, TData = unknown>(
  code: TCode,
  {
    status,
    ...options
  }: ORPCErrorFactoryOptions<TData> & { status?: HttpErrorStatus }
) {
  if (status !== undefined) {
    const registered = ERROR_STATUSES[code];

    if (registered !== undefined && registered !== status) {
      throw new Error(
        `Error code ${code} is already registered with status ${registered}.`
      );
    }

    ERROR_STATUSES[code] = status;
  }

  return error(code, options);
}

export const validationIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
  path: z.array(z.union([z.string(), z.number()])),
});

export const InputValidationFailed = defineError("UNPROCESSABLE_CONTENT", {
  data: z.object({ issues: z.array(validationIssueSchema) }),
  message: "Input validation failed.",
});

export const BadRequest = defineError("BAD_REQUEST", {
  message:
    "Malformed request. Check the request body, query, and Content-Type header.",
});

export const InternalServerError = defineError("INTERNAL_SERVER_ERROR", {
  message: "Something went wrong.",
});

export const Unauthorized = defineError("UNAUTHORIZED", {
  message: "Not logged in.",
});

export const Forbidden = defineError("FORBIDDEN", {
  message: "You don't have access to this.",
});

export const NotFound = defineError("NOT_FOUND", { message: "Not found." });

export const Conflict = defineError("CONFLICT", {
  message: "This conflicts with existing data.",
});

export type ValidationIssue = z.infer<typeof validationIssueSchema>;
