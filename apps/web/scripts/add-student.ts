import "dotenv/config";
import process from "node:process";

import { cancel, intro, outro, password, spinner, text } from "@clack/prompts";

import { db } from "@/server/db/client";
import { students } from "@/server/db/schema";
import { CREDENTIAL_MAX_LENGTH } from "@/server/modules/auth/auth.constants";
import { hashPassword } from "@/server/modules/auth/auth.service";

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
    validate: required("Student ID"),
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
    validate: required("Password"),
  })
);

const progress = spinner();
progress.start("Saving");

const passwordHash = await hashPassword(plainPassword);
await db
  .insert(students)
  .values({ name, passwordHash, studentId })
  .onConflictDoUpdate({
    set: { name, passwordHash },
    target: students.studentId,
  });

progress.stop(`Saved ${name} (${studentId}).`);
outro("Re-run with the same student ID to rename or reset the password.");
process.exit(0);
