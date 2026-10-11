import { openapi } from "@orpc/openapi";
import { deleteCookie, getCookie, setCookie } from "@orpc/server/helpers";

import { COOKIE_OPTIONS } from "@/server/constants";
import { inputValidation } from "@/server/core/input-validation";
import { SESSION_COOKIE_NAME } from "@/server/modules/auth/auth.constants";
import { AuthInvalidCredentials } from "@/server/modules/auth/auth.errors";
import {
  loginInputSchema,
  sessionSchema,
} from "@/server/modules/auth/auth.schemas";
import {
  authenticate,
  createSession,
  revokeSession,
} from "@/server/modules/auth/auth.service";
import { protectedOS, publicOS } from "@/server/orpc";

const TAGS = ["Auth"];

const login = publicOS
  .meta(
    openapi({
      description:
        "Checks the student ID and password and starts a 30-day session stored in an HttpOnly cookie.",
      method: "POST",
      path: "/auth/login",
      summary: "Log in",
      tags: TAGS,
    })
  )
  .use(inputValidation)
  .input(loginInputSchema)
  .output(sessionSchema)
  .errors({ [AuthInvalidCredentials.code]: AuthInvalidCredentials })
  .handler(async ({ context, input }) => {
    const student = await authenticate(input);

    if (student === null) {
      throw new AuthInvalidCredentials();
    }

    const { expiresAt, token } = await createSession(student.id, {
      ipAddress: context.clientIp,
      userAgent: context.headers.get("user-agent"),
    });

    setCookie(context.resHeaders, SESSION_COOKIE_NAME, token, {
      ...COOKIE_OPTIONS,
      expires: expiresAt,
    });

    return { expiresAt, student };
  });

const session = protectedOS
  .meta(
    openapi({
      description: "Returns the student behind the current session cookie.",
      method: "GET",
      path: "/auth/session",
      summary: "Get current session",
      tags: TAGS,
    })
  )
  .output(sessionSchema)
  .handler(({ context }) => context.session);

const logout = publicOS
  .meta(
    openapi({
      description:
        "Revokes the current session, if any, and clears the cookie.",
      method: "POST",
      path: "/auth/logout",
      successStatus: 204,
      summary: "Log out",
      tags: TAGS,
    })
  )
  .handler(async ({ context }) => {
    const token = getCookie(context.headers, SESSION_COOKIE_NAME);

    if (token !== undefined) {
      await revokeSession(token);
    }

    deleteCookie(context.resHeaders, SESSION_COOKIE_NAME, {
      path: COOKIE_OPTIONS.path,
    });
  });

export const authRouter = { login, logout, session };
