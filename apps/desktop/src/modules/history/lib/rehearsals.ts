import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { daysAgo } from "@/lib/format";
import { uuidv7 } from "@/lib/uuid";
import { wavPath } from "@/modules/analysis/lib/audio";
import { speechPath } from "@/modules/analysis/lib/speech";
import { db } from "@/modules/common/db/client";
import { attempts, rehearsals } from "@/modules/common/db/schema";
import type {
  AttemptRow,
  AttemptStatus,
  RehearsalRow,
} from "@/modules/common/db/schema";
import {
  deleteRecording,
  listRecordings,
  recordingPath,
} from "@/modules/common/lib/recordings";

// Talks shorter than this aren't analysed or kept (PLAN §2.4).
export const MIN_SPOKEN_SECONDS = 30;

export type Attempt = AttemptRow & { n: number };

export type Rehearsal = RehearsalRow & {
  attempts: Attempt[];
  latest: Attempt | undefined;
};

export type RehearsalSummary = Pick<
  RehearsalRow,
  "id" | "topic" | "updatedAt"
> & {
  attemptCount: number;
  latestScore: number | null;
  // The newest attempt's status: the sidebar shows analysing / failed.
  latestStatus: AttemptStatus | null;
};

// Reads

// The student's threads, most recently practised first, with the latest score.
export async function listRehearsals(
  studentId: string
): Promise<RehearsalSummary[]> {
  const rows = await db
    .select({
      id: rehearsals.id,
      topic: rehearsals.topic,
      updatedAt: rehearsals.updatedAt,
    })
    .from(rehearsals)
    .where(eq(rehearsals.studentId, studentId))
    .orderBy(desc(rehearsals.updatedAt));

  const latest = await db
    .select({
      rehearsalId: attempts.rehearsalId,
      score: attempts.score,
      status: attempts.status,
    })
    .from(attempts)
    .innerJoin(rehearsals, eq(attempts.rehearsalId, rehearsals.id))
    .where(eq(rehearsals.studentId, studentId))
    .orderBy(asc(attempts.createdAt));

  // Later rows overwrite earlier ones, leaving each thread's newest.
  const latestScore = new Map(
    latest.flatMap(({ rehearsalId, score }) =>
      score === null ? [] : [[rehearsalId, score] as const]
    )
  );
  const latestStatus = new Map(
    latest.map(({ rehearsalId, status }) => [rehearsalId, status])
  );
  const attemptCount = new Map<string, number>();
  for (const { rehearsalId } of latest) {
    attemptCount.set(rehearsalId, (attemptCount.get(rehearsalId) ?? 0) + 1);
  }

  return rows.map((row) => ({
    ...row,
    attemptCount: attemptCount.get(row.id) ?? 0,
    latestScore: latestScore.get(row.id) ?? null,
    latestStatus: latestStatus.get(row.id) ?? null,
  }));
}

// One thread with its attempts, oldest first and numbered from 1.
export async function getRehearsal(
  studentId: string,
  id: string
): Promise<Rehearsal | null> {
  const [rehearsal] = await db
    .select()
    .from(rehearsals)
    .where(and(eq(rehearsals.id, id), eq(rehearsals.studentId, studentId)))
    .limit(1);

  if (rehearsal === undefined) {
    return null;
  }

  const rows = await db
    .select()
    .from(attempts)
    .where(eq(attempts.rehearsalId, id))
    .orderBy(asc(attempts.createdAt));
  const numbered = rows.map((row, index) => ({ ...row, n: index + 1 }));

  return { ...rehearsal, attempts: numbered, latest: numbered.at(-1) };
}

export type Progress = {
  // The last 7 days, ending today, and whether the student practised on each.
  days: { date: Date; practised: boolean }[];
  lastScore: { delta: number | null; score: number; topic: string } | null;
  // Consecutive days with practice, ending today (or yesterday).
  streak: number;
};

export async function getProgress(studentId: string): Promise<Progress> {
  const rows = await db
    .select({
      createdAt: attempts.createdAt,
      rehearsalId: attempts.rehearsalId,
      score: attempts.score,
      topic: rehearsals.topic,
    })
    .from(attempts)
    .innerJoin(rehearsals, eq(attempts.rehearsalId, rehearsals.id))
    .where(eq(rehearsals.studentId, studentId))
    .orderBy(asc(attempts.createdAt));

  const practised = new Set(rows.map(({ createdAt }) => daysAgo(createdAt)));
  let streak = 0;
  for (let day = practised.has(0) ? 0 : 1; practised.has(day); day += 1) {
    streak += 1;
  }

  const scored = rows.filter(
    (row): row is typeof row & { score: number } => row.score !== null
  );
  const last = scored.at(-1);
  const previous = scored.findLast(
    (row) => row !== last && row.rehearsalId === last?.rehearsalId
  );

  return {
    days: Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return { date, practised: practised.has(6 - index) };
    }),
    lastScore:
      last === undefined
        ? null
        : {
            delta: previous === undefined ? null : last.score - previous.score,
            score: last.score,
            topic: last.topic,
          },
    streak,
  };
}

// Writes

type StartAttemptInput = {
  extension: string;
  mimeType: string;
  // Try again passes the thread; a new topic finds or creates one.
  rehearsalId?: string;
  studentId: string;
  targetSeconds: number;
  topic: string;
  topicId?: string;
};

async function findOrCreateRehearsal({
  rehearsalId,
  studentId,
  targetSeconds,
  topic,
  topicId,
}: StartAttemptInput) {
  if (rehearsalId !== undefined) {
    const [existing] = await db
      .select({ id: rehearsals.id })
      .from(rehearsals)
      .where(
        and(eq(rehearsals.id, rehearsalId), eq(rehearsals.studentId, studentId))
      )
      .limit(1);

    if (existing === undefined) {
      throw new Error("This rehearsal no longer exists.");
    }

    return existing.id;
  }

  const match = and(
    eq(rehearsals.studentId, studentId),
    eq(rehearsals.targetSeconds, targetSeconds),
    topicId === undefined
      ? sql`${rehearsals.topicId} is null and ${rehearsals.topic} = ${topic}`
      : eq(rehearsals.topicId, topicId)
  );
  const [existing] = await db
    .select({ id: rehearsals.id })
    .from(rehearsals)
    .where(match)
    .limit(1);

  if (existing !== undefined) {
    return existing.id;
  }

  const id = uuidv7();
  await db
    .insert(rehearsals)
    .values({ id, studentId, targetSeconds, topic, topicId });

  return id;
}

// Creates the attempt (and its thread if needed) before the first byte is
// recorded, so a crash mid-talk still leaves a row to recover.
export async function startAttempt(input: StartAttemptInput) {
  const rehearsalId = await findOrCreateRehearsal(input);
  const id = uuidv7();
  const path = recordingPath(id, input.extension);
  const now = new Date();

  await db.batch([
    db.insert(attempts).values({
      id,
      mimeType: input.mimeType,
      recordingPath: path,
      rehearsalId,
      status: "recording",
    }),
    db
      .update(rehearsals)
      .set({ updatedAt: now })
      .where(eq(rehearsals.id, rehearsalId)),
  ]);

  return { id, path, rehearsalId };
}

// Saved every few seconds while recording, so a recovered attempt knows how
// long it is.
export async function updateSpokenSeconds(id: string, spokenSeconds: number) {
  await db.update(attempts).set({ spokenSeconds }).where(eq(attempts.id, id));
}

export async function completeAttempt(
  id: string,
  { spokenSeconds, status }: { spokenSeconds: number; status: AttemptStatus }
) {
  await db
    .update(attempts)
    .set({ spokenSeconds, status })
    .where(eq(attempts.id, id));
}

// An attempt's files: the recording, plus what analysis leaves next to it
// (the 16 kHz WAV while analysing, the cached transcript and prosody).
async function deleteAttemptFiles(id: string, path: string) {
  await Promise.all(
    [path, wavPath(id), speechPath(id)].map(async (file) => {
      await deleteRecording(file);
    })
  );
}

async function deleteEmptyRehearsals(ids: string[]) {
  if (ids.length === 0) {
    return;
  }

  const remaining = await db
    .select({ rehearsalId: attempts.rehearsalId })
    .from(attempts)
    .where(inArray(attempts.rehearsalId, ids));
  const used = new Set(remaining.map(({ rehearsalId }) => rehearsalId));
  const empty = ids.filter((id) => !used.has(id));

  if (empty.length > 0) {
    await db.delete(rehearsals).where(inArray(rehearsals.id, empty));
  }
}

// Removes an attempt and its audio; a thread left without attempts goes too.
export async function discardAttempt(id: string) {
  const [attempt] = await db
    .select({
      recordingPath: attempts.recordingPath,
      rehearsalId: attempts.rehearsalId,
    })
    .from(attempts)
    .where(eq(attempts.id, id))
    .limit(1);

  if (attempt === undefined) {
    return;
  }

  await deleteAttemptFiles(id, attempt.recordingPath);
  await db.delete(attempts).where(eq(attempts.id, id));
  await deleteEmptyRehearsals([attempt.rehearsalId]);
}

// A thread's attempts, for stopping their analysis before deleting.
export async function listRehearsalAttempts(studentId: string, id: string) {
  return await db
    .select({
      feedbackJobId: attempts.feedbackJobId,
      id: attempts.id,
      recordingPath: attempts.recordingPath,
    })
    .from(attempts)
    .innerJoin(rehearsals, eq(attempts.rehearsalId, rehearsals.id))
    .where(and(eq(rehearsals.id, id), eq(rehearsals.studentId, studentId)));
}

// Deletes a thread with every attempt and file. Rows go first (attempts
// cascade), so nothing ever points at a missing file.
export async function deleteRehearsal(studentId: string, id: string) {
  const rows = await listRehearsalAttempts(studentId, id);

  await db
    .delete(rehearsals)
    .where(and(eq(rehearsals.id, id), eq(rehearsals.studentId, studentId)));
  await Promise.all(
    rows.map(async (row) => {
      await deleteAttemptFiles(row.id, row.recordingPath);
    })
  );

  return rows;
}

// Analysis

export type AnalysisTarget = Pick<
  AttemptRow,
  "feedbackJobId" | "id" | "recordingPath" | "spokenSeconds" | "status"
> &
  Pick<RehearsalRow, "studentId" | "targetSeconds" | "topic" | "topicId"> & {
    rehearsalId: string;
  };

export async function getAnalysisTarget(
  id: string
): Promise<AnalysisTarget | null> {
  const [row] = await db
    .select({
      feedbackJobId: attempts.feedbackJobId,
      id: attempts.id,
      recordingPath: attempts.recordingPath,
      rehearsalId: attempts.rehearsalId,
      spokenSeconds: attempts.spokenSeconds,
      status: attempts.status,
      studentId: rehearsals.studentId,
      targetSeconds: rehearsals.targetSeconds,
      topic: rehearsals.topic,
      topicId: rehearsals.topicId,
    })
    .from(attempts)
    .innerJoin(rehearsals, eq(attempts.rehearsalId, rehearsals.id))
    .where(eq(attempts.id, id))
    .limit(1);

  return row ?? null;
}

// Attempts waiting for (or in the middle of) analysis, oldest first.
export async function listAttemptsToAnalyse(studentId: string) {
  const rows = await db
    .select({ id: attempts.id })
    .from(attempts)
    .innerJoin(rehearsals, eq(attempts.rehearsalId, rehearsals.id))
    .where(
      and(
        eq(rehearsals.studentId, studentId),
        eq(attempts.status, "processing")
      )
    )
    .orderBy(asc(attempts.createdAt));

  return rows.map(({ id }) => id);
}

export async function setFeedbackJob(id: string, feedbackJobId: string | null) {
  await db.update(attempts).set({ feedbackJobId }).where(eq(attempts.id, id));
}

export async function failAnalysis(id: string, error: string) {
  await db
    .update(attempts)
    .set({ error, status: "failed" })
    .where(and(eq(attempts.id, id), eq(attempts.status, "processing")));
}

// Back into the queue: failed analyses, and interrupted talks long enough to
// analyse. The server review is requested again (it restarts a failed one).
export async function queueAnalysis(id: string) {
  await db
    .update(attempts)
    .set({ error: null, feedbackJobId: null, status: "processing" })
    .where(
      and(
        eq(attempts.id, id),
        inArray(attempts.status, ["failed", "interrupted"])
      )
    );
}

export async function completeAnalysis(
  id: string,
  { feedback, score }: Pick<AttemptRow, "feedback" | "score">
) {
  await db
    .update(attempts)
    .set({ error: null, feedback, score, status: "ready" })
    .where(and(eq(attempts.id, id), eq(attempts.status, "processing")));
}

// The attempt a file belongs to: recordings/<attemptId>.<ext>.
function ownerOf(path: string) {
  return path.slice(path.lastIndexOf("/") + 1).split(".")[0] ?? "";
}

// On launch: an attempt still "recording" means the app closed mid-talk. Keep
// it as interrupted when there's enough audio, drop it otherwise, and delete
// audio files no attempt points to.
export async function recoverAttempts() {
  const unfinished = await db
    .select({
      id: attempts.id,
      recordingPath: attempts.recordingPath,
      rehearsalId: attempts.rehearsalId,
      spokenSeconds: attempts.spokenSeconds,
    })
    .from(attempts)
    .where(eq(attempts.status, "recording"));

  const keep = unfinished.filter(
    ({ spokenSeconds }) => spokenSeconds >= MIN_SPOKEN_SECONDS
  );
  const drop = unfinished.filter(
    ({ spokenSeconds }) => spokenSeconds < MIN_SPOKEN_SECONDS
  );

  if (keep.length > 0) {
    await db
      .update(attempts)
      .set({ status: "interrupted" })
      .where(
        inArray(
          attempts.id,
          keep.map(({ id }) => id)
        )
      );
  }

  if (drop.length > 0) {
    await Promise.all(
      drop.map(async ({ id, recordingPath: path }) => {
        await deleteAttemptFiles(id, path);
      })
    );
    await db.delete(attempts).where(
      inArray(
        attempts.id,
        drop.map(({ id }) => id)
      )
    );
    await deleteEmptyRehearsals([
      ...new Set(drop.map(({ rehearsalId }) => rehearsalId)),
    ]);
  }

  // Files belong to an attempt by name: recordings/<attemptId>.<ext>.
  const referenced = await db.select({ id: attempts.id }).from(attempts);
  const known = new Set(referenced.map(({ id }) => id));
  const files = await listRecordings();

  await Promise.all(
    files
      .filter((path) => !known.has(ownerOf(path)))
      .map(async (path) => {
        await deleteRecording(path);
      })
  );
}
