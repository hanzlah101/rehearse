import { os } from "@orpc/server";
import { getCookie } from "@orpc/server/helpers";

import { Unauthorized } from "@/server/errors";
import { SESSION_COOKIE_NAME } from "@/server/modules/auth/auth.constants";
import { findActiveSession } from "@/server/modules/auth/auth.service";
import type { Context } from "@/server/orpc";

const BEARER = /^Bearer (?<token>\S+)$/u;

// The session token: an `Authorization: Bearer` header (the desktop app, which
// is cross-site to the API so it can't send the cookie) or the session cookie
// (browsers).
export function getSessionToken(headers: Headers) {
  const bearer = BEARER.exec(headers.get("authorization") ?? "")?.groups?.token;
  return bearer ?? getCookie(headers, SESSION_COOKIE_NAME);
}

export const requireSession = os
  .$context<Context>()
  .errors({ [Unauthorized.code]: Unauthorized })
  .middleware(async ({ context, next }) => {
    const token = getSessionToken(context.headers);
    const session = token === undefined ? null : await findActiveSession(token);

    if (token === undefined || session === null) {
      throw new Unauthorized();
    }

    // The token tells this session apart from the student's others (a
    // password change signs out everywhere else).
    return await next({ context: { session, sessionToken: token } });
  });
