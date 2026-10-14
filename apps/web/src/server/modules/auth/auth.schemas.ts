import { z } from "zod";

import {
  CREDENTIAL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/server/modules/auth/auth.constants";

export const loginInputSchema = z
  .object({
    studentId: z
      .string()
      .trim()
      .min(1, { error: "Enter your student ID." })
      .max(CREDENTIAL_MAX_LENGTH)
      .meta({ examples: ["STU-001"] }),
    password: z
      .string()
      .min(1, { error: "Enter your password." })
      .max(CREDENTIAL_MAX_LENGTH)
      .meta({ examples: ["correct-horse-battery"] }),
  })
  .meta({ id: "LoginInput" });

export const studentSchema = z
  .object({
    id: z.uuid(),
    name: z.string().meta({ examples: ["Ayesha Khan"] }),
    studentId: z.string().meta({ examples: ["STU-001"] }),
  })
  .meta({ id: "Student" });

export const sessionSchema = z
  .object({
    expiresAt: z.date().meta({ examples: ["2026-11-10T09:00:00.000Z"] }),
    student: studentSchema,
  })
  .meta({ id: "Session" });

export const updateProfileInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: "Enter your name." })
      .max(NAME_MAX_LENGTH, {
        error: `Keep your name under ${String(NAME_MAX_LENGTH)} characters.`,
      })
      .meta({ examples: ["Ayesha Khan"] }),
  })
  .meta({ id: "UpdateProfileInput" });

// The new password is checked against the current one here too, so the
// desktop form shows the same rule before sending anything.
export const changePasswordInputSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { error: "Enter your current password." })
      .max(CREDENTIAL_MAX_LENGTH),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, {
        error: `Use at least ${String(PASSWORD_MIN_LENGTH)} characters.`,
      })
      .max(CREDENTIAL_MAX_LENGTH, {
        error: `Keep it under ${String(CREDENTIAL_MAX_LENGTH)} characters.`,
      }),
  })
  .refine((input) => input.newPassword !== input.currentPassword, {
    error: "Choose a password different from your current one.",
    path: ["newPassword"],
  })
  .meta({ id: "ChangePasswordInput" });

export type LoginInput = z.infer<typeof loginInputSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;
export type Student = z.infer<typeof studentSchema>;
export type Session = z.infer<typeof sessionSchema>;
