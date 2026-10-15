import { openapi } from "@orpc/openapi";
import { deleteCookie, setCookie } from "@orpc/server/helpers";

import { COOKIE_OPTIONS } from "@/server/constants";
import { inputValidation } from "@/server/core/input-validation";
import { Unauthorized } from "@/server/errors";
import { SESSION_COOKIE_NAME } from "@/server/modules/auth/auth.constants";
import {
  AuthIncorrectPassword,
  AuthInvalidCredentials,
} from "@/server/modules/auth/auth.errors";
import { getSessionToken } from "@/server/modules/auth/auth.middleware";
import {
  changePasswordInputSchema,
  loginInputSchema,
  loginOutputSchema,
  sessionSchema,
  studentSchema,
  updateProfileInputSchema,
} from "@/server/modules/auth/auth.schemas";
import {
  authenticate,
  changePassword as changeStudentPassword,
  createSession,
  revokeSession,
  updateProfile as updateStudentProfile,
} from "@/server/modules/auth/auth.service";
import { protectedOS, publicOS } from "@/server/orpc";

const TAGS = ["Auth"];

const login = publicOS
  .meta(
    openapi({
      description:
        "Checks the student ID and password and starts a 30-day session: stored in an HttpOnly cookie for browsers, and returned as `token` for clients that send `Authorization: Bearer`.",
      method: "POST",
      path: "/auth/login",
      summary: "Log in",
      tags: TAGS,
    })
  )
  .use(inputValidation)
  .input(loginInputSchema)
  .output(loginOutputSchema)
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

    return { expiresAt, student, token };
  });

const session = protectedOS
  .meta(
    openapi({
      description:
        "Returns the student behind the current session (cookie or bearer token).",
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
        "Revokes the current session (cookie or bearer token), if any, and clears the cookie.",
      method: "POST",
      path: "/auth/logout",
      successStatus: 204,
      summary: "Log out",
      tags: TAGS,
    })
  )
  .handler(async ({ context }) => {
    const token = getSessionToken(context.headers);

    if (token !== undefined) {
      await revokeSession(token);
    }

    deleteCookie(context.resHeaders, SESSION_COOKIE_NAME, {
      path: COOKIE_OPTIONS.path,
    });
  });

const updateProfile = protectedOS
  .meta(
    openapi({
      description:
        "Renames the logged-in student. The student ID can't change.",
      method: "PATCH",
      path: "/auth/profile",
      summary: "Update profile",
      tags: TAGS,
    })
  )
  .use(inputValidation)
  .input(updateProfileInputSchema)
  .output(studentSchema)
  .errors({ [Unauthorized.code]: Unauthorized })
  .handler(async ({ context, input }) => {
    const student = await updateStudentProfile(
      context.session.student.id,
      input
    );

    // Deleted between the session check and the update.
    if (student === null) {
      throw new Unauthorized();
    }

    return student;
  });

const changePassword = protectedOS
  .meta(
    openapi({
      description:
        "Checks the current password, sets the new one and signs out every other session.",
      method: "POST",
      path: "/auth/password",
      successStatus: 204,
      summary: "Change password",
      tags: TAGS,
    })
  )
  .use(inputValidation)
  .input(changePasswordInputSchema)
  .errors({ [AuthIncorrectPassword.code]: AuthIncorrectPassword })
  .handler(async ({ context, input }) => {
    const isChanged = await changeStudentPassword(
      context.session.student.id,
      input,
      context.sessionToken
    );

    if (!isChanged) {
      throw new AuthIncorrectPassword();
    }
  });

export const authRouter = {
  changePassword,
  login,
  logout,
  session,
  updateProfile,
};
