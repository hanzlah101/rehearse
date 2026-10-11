import { z } from "zod";

import { CREDENTIAL_MAX_LENGTH } from "@/server/modules/auth/auth.constants";

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

export type LoginInput = z.infer<typeof loginInputSchema>;
export type Student = z.infer<typeof studentSchema>;
export type Session = z.infer<typeof sessionSchema>;
