import { openapi } from "@orpc/openapi";
import { os } from "@orpc/server";

import { declaredErrorsOnly } from "@/server/core/declared-errors";
import { BadRequest, Forbidden, InternalServerError } from "@/server/errors";
import { requireSession } from "@/server/modules/auth/auth.middleware";

export type Context = {
  clientIp: string | null;
  headers: Headers;
  // Injected by ResponseHeadersHandlerPlugin; absent for in-process SSR calls.
  resHeaders?: Headers;
};

export const publicOS = os
  .$context<Context>()
  .errors({
    [BadRequest.code]: BadRequest,
    [InternalServerError.code]: InternalServerError,
  })
  .use(declaredErrorsOnly);

// Either the session cookie (browsers) or a bearer token (the desktop app).
const SECURITY: Record<string, string[]>[] = [
  { cookieAuth: [] },
  { bearerAuth: [] },
];

// Forbidden: GetMethodCsrfProtectionHandlerPlugin can block GET procedures.
export const protectedOS = publicOS
  .meta(
    openapi({
      spec: (operation) => ({ ...operation, security: SECURITY }),
    })
  )
  .errors({ [Forbidden.code]: Forbidden })
  .use(requireSession);
