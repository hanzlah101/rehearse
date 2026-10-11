import { createHash, randomBytes } from "node:crypto";

import { hash, verify } from "@node-rs/argon2";
import { and, eq, gt } from "drizzle-orm";

import { db } from "@/server/db/client";
import { sessions, students } from "@/server/db/schema";
import type { Session } from "@/server/db/schema";
import {
  DUMMY_PASSWORD_BYTES,
  PASSWORD_HASH_OPTIONS,
  SESSION_TOKEN_BYTES,
  SESSION_TTL_MS,
} from "@/server/modules/auth/auth.constants";
import type { LoginInput } from "@/server/modules/auth/auth.schemas";

export type SessionMetadata = Pick<Session, "ipAddress" | "userAgent">;

const publicStudentColumns = {
  id: students.id,
  name: students.name,
  studentId: students.studentId,
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Passwords

export async function hashPassword(password: string) {
  return await hash(password, PASSWORD_HASH_OPTIONS);
}

const dummyPasswordHash = hashPassword(
  randomBytes(DUMMY_PASSWORD_BYTES).toString("hex")
);

export async function authenticate({ password, studentId }: LoginInput) {
  const [student] = await db
    .select({ ...publicStudentColumns, passwordHash: students.passwordHash })
    .from(students)
    .where(eq(students.studentId, studentId))
    .limit(1);

  // Verify against a dummy hash for unknown IDs so timing doesn't leak them.
  const passwordHash = student?.passwordHash ?? (await dummyPasswordHash);
  const isValid = await verify(passwordHash, password);

  if (student === undefined || !isValid) {
    return null;
  }

  const { passwordHash: _, ...publicStudent } = student;

  return publicStudent;
}

// Sessions

export async function createSession(
  studentId: string,
  metadata: SessionMetadata
) {
  const token = randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    ...metadata,
    expiresAt,
    id: hashToken(token),
    studentId,
  });

  return { expiresAt, token };
}

export async function findActiveSession(token: string) {
  const [session] = await db
    .select({ expiresAt: sessions.expiresAt, student: publicStudentColumns })
    .from(sessions)
    .innerJoin(students, eq(sessions.studentId, students.id))
    .where(
      and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date()))
    )
    .limit(1);

  return session ?? null;
}

export type ActiveSession = NonNullable<
  Awaited<ReturnType<typeof findActiveSession>>
>;

export async function revokeSession(token: string) {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}
