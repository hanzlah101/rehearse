import "dotenv/config";
import process from "node:process";

import { cancel, intro, outro, password, spinner, text } from "@clack/prompts";

import { db } from "@/server/db/client";
import { students } from "@/server/db/schema";
import { CREDENTIAL_MAX_LENGTH } from "@/server/modules/auth/auth.constants";
import { loginInputSchema } from "@/server/modules/auth/auth.schemas";
import { hashPassword } from "@/server/modules/auth/auth.service";
import { FEEDBACK_DEFAULT_DAILY_SECONDS } from "@/server/modules/feedback/feedback.constants";

function required(label: string) {
  return (value: string | undefined) => {
    const trimmed = value?.trim() ?? "";

    if (trimmed === "") {
      return `${label} is required.`;
    }

    return trimmed.length > CREDENTIAL_MAX_LENGTH
      ? `${label} must be at most ${CREDENTIAL_MAX_LENGTH} characters.`
      : undefined;
  };
}

// Student ID and password must pass the exact rules login applies (password
// untrimmed), or the student could be saved with credentials that never log in.
function matchesLogin(field: keyof typeof loginInputSchema.shape) {
  return (value: string | undefined) => {
    const result = loginInputSchema.shape[field].safeParse(value ?? "");
    return result.success ? undefined : result.error.issues[0]?.message;
  };
}

// Ctrl-C mid-prompt resolves to clack's cancel symbol instead of throwing.
function ask(answer: string | symbol): string {
  if (typeof answer === "symbol") {
    cancel("Cancelled, nothing saved.");
    process.exit(0);
  }

  return answer;
}

intro("Add a student");

const studentId = ask(
  await text({
    message: "Student ID",
    placeholder: "STU-001",
    validate: matchesLogin("studentId"),
  })
).trim();

const name = ask(
  await text({
    message: "Full name",
    placeholder: "Ayesha Khan",
    validate: required("Name"),
  })
).trim();

const plainPassword = ask(
  await password({
    message: "Password",
    validate: matchesLogin("password"),
  })
);

const dailyLimitMinutes = Number(
  ask(
    await text({
      initialValue: String(FEEDBACK_DEFAULT_DAILY_SECONDS / 60),
      message: "Minutes of speaking reviewed per day",
      validate: (value) =>
        /^[1-9]\d*$/u.test(value?.trim() ?? "")
          ? undefined
          : "Enter a whole number of minutes (1 or more).",
    })
  ).trim()
);
const dailyLimitSeconds = dailyLimitMinutes * 60;

const progress = spinner();
progress.start("Saving");

const passwordHash = await hashPassword(plainPassword);
await db
  .insert(students)
  .values({ dailyLimitSeconds, name, passwordHash, studentId })
  .onConflictDoUpdate({
    set: { dailyLimitSeconds, name, passwordHash },
    target: students.studentId,
  });

progress.stop(
  `Saved ${name} (${studentId}), ${dailyLimitMinutes} min of reviews a day.`
);
outro(
  "Re-run with the same student ID to rename, reset the password or change the limit."
);
process.exit(0);
