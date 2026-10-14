import { defineError } from "@/server/errors";

export const AuthInvalidCredentials = defineError("AUTH_INVALID_CREDENTIALS", {
  status: 401,
  message: "Student ID or password is incorrect.",
});

export const AuthIncorrectPassword = defineError("AUTH_INCORRECT_PASSWORD", {
  status: 400,
  message: "Your current password is incorrect.",
});
