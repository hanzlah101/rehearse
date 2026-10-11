import { defineError } from "@/server/errors";

export const AuthInvalidCredentials = defineError("AUTH_INVALID_CREDENTIALS", {
  status: 401,
  message: "Student ID or password is incorrect.",
});
