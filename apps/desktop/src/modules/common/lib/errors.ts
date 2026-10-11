import { ORPCError } from "@orpc/client";

// No or expired session. Other 401s (e.g. AUTH_INVALID_CREDENTIALS) use their own codes.
export function isUnauthorized(error: unknown) {
  return error instanceof ORPCError && error.code === "UNAUTHORIZED";
}

// Declared API errors carry a user-facing message; anything else is transport.
export function getErrorMessage(error: unknown, message?: string) {
  return error instanceof ORPCError && error.defined
    ? error.message
    : (message ??
        "Couldn't reach the server. Check your connection and try again.");
}
