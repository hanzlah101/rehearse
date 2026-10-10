import process from "node:process";
import { createInterface } from "node:readline/promises";

import { db } from "@/server/db/client";
import { students } from "@/server/db/schema";
import { hashPassword } from "@/server/modules/auth/auth.service";

const [studentId, name] = process.argv.slice(2);
if (studentId === undefined || name === undefined) {
  console.error("Usage: bun run student:add <student-id> <name>");
  process.exit(1);
}

const prompt = createInterface({
  input: process.stdin,
  output: process.stdout,
});
const password = await prompt.question("Password: ");
prompt.close();
if (password === "") {
  console.error("Password is required.");
  process.exit(1);
}

const passwordHash = await hashPassword(password);
await db
  .insert(students)
  .values({ name, passwordHash, studentId })
  .onConflictDoUpdate({
    set: { name, passwordHash },
    target: students.studentId,
  });

console.log(`Saved student ${studentId}.`);
process.exit(0);
