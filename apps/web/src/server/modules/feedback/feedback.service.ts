import { and, asc, eq, gt, sql } from "drizzle-orm";
import { getClientSubscriptionToken } from "inngest/react";

import { db } from "@/server/db/client";
import {
  feedbackJobs,
  feedbackRequests,
  keyPoints,
  students,
} from "@/server/db/schema";
import type { FeedbackJob } from "@/server/db/schema";
import { inngest } from "@/server/inngest";
import {
  FeedbackRateLimited,
  FeedbackUnavailable,
} from "@/server/modules/feedback/feedback.errors";
import {
  feedbackCancelled,
  feedbackChannel,
  feedbackRequested,
} from "@/server/modules/feedback/feedback.events";
import type {
  FeedbackJobView,
  FeedbackResult,
  FeedbackStage,
  FeedbackSubscription,
  FeedbackUsage,
  KeyPoint,
  SubmitFeedbackInput,
} from "@/server/modules/feedback/feedback.schemas";

const DAY_MS = 24 * 60 * 60 * 1000;

// Speaking time sent for review in the last 24 hours. Takes the transaction
// when called under the submit lock.
async function usageOf(
  executor: Pick<typeof db, "select">,
  studentId: string
): Promise<FeedbackUsage> {
  const [student] = await executor
    .select({ limitSeconds: students.dailyLimitSeconds })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);

  if (student === undefined) {
    throw new Error(`Student ${studentId} doesn't exist.`);
  }

  const requests = await executor
    .select({
      createdAt: feedbackRequests.createdAt,
      spokenSeconds: feedbackRequests.spokenSeconds,
    })
    .from(feedbackRequests)
    .where(
      and(
        eq(feedbackRequests.studentId, studentId),
        gt(feedbackRequests.createdAt, new Date(Date.now() - DAY_MS))
      )
    )
    .orderBy(asc(feedbackRequests.createdAt));

  const { limitSeconds } = student;
  const usedSeconds = requests.reduce(
    (total, request) => total + request.spokenSeconds,
    0
  );

  // Requests leave the window oldest first; once the limit is used up, the
  // student can review again when enough of them have left.
  let left = usedSeconds;
  let refreshesAt: Date | null = null;
  for (const request of requests) {
    if (left < limitSeconds) {
      break;
    }
    left -= request.spokenSeconds;
    refreshesAt = new Date(request.createdAt.getTime() + DAY_MS);
  }

  return { limitSeconds, refreshesAt, usedSeconds };
}

export async function getFeedbackUsage(studentId: string) {
  return await usageOf(db, studentId);
}

function toView({
  attemptId,
  error,
  id,
  result,
  stage,
  status,
}: FeedbackJob): FeedbackJobView {
  return { attemptId, error, id, result, stage, status };
}

async function findJob(studentId: string, id: string) {
  const [job] = await db
    .select()
    .from(feedbackJobs)
    .where(and(eq(feedbackJobs.id, id), eq(feedbackJobs.studentId, studentId)))
    .limit(1);

  return job;
}

async function startRun(job: FeedbackJob) {
  try {
    // The event id dedupes double sends of the same run; a re-run after a
    // failure has a new updatedAt, so it gets through.
    await inngest.send(
      feedbackRequested.create(
        { jobId: job.id, studentId: job.studentId },
        { id: `${job.id}:${job.updatedAt.getTime()}` }
      )
    );
  } catch (error) {
    console.error("[feedback] couldn't send feedback/requested", error);
    await db
      .update(feedbackJobs)
      .set({
        error: "The review couldn't be started.",
        status: "failed",
      })
      .where(eq(feedbackJobs.id, job.id));
    throw new FeedbackUnavailable();
  }

  return toView(job);
}

// Starts a review of one attempt. Idempotent per attempt: a queued, running or
// finished job is returned as is; a failed or cancelled one starts again with
// the new input.
export async function submitFeedback(
  studentId: string,
  input: SubmitFeedbackInput
) {
  const [existing] = await db
    .select()
    .from(feedbackJobs)
    .where(
      and(
        eq(feedbackJobs.studentId, studentId),
        eq(feedbackJobs.attemptId, input.attemptId)
      )
    )
    .limit(1);

  if (existing !== undefined) {
    if (existing.status !== "failed" && existing.status !== "cancelled") {
      return toView(existing);
    }

    const [restarted] = await db
      .update(feedbackJobs)
      .set({
        error: null,
        input,
        result: null,
        stage: "queued",
        status: "queued",
      })
      .where(eq(feedbackJobs.id, existing.id))
      .returning();

    if (restarted === undefined) {
      throw new Error(`Feedback job ${existing.id} vanished while restarting.`);
    }

    return await startRun(restarted);
  }

  // Check and insert under a per-student lock, so concurrent submits can't
  // all see time left under the limit. A talk is accepted while any time is
  // left and counts in full, so the last one may run over.
  const created = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`feedback:${studentId}`}))`
    );
    const { limitSeconds, usedSeconds } = await usageOf(tx, studentId);

    if (usedSeconds >= limitSeconds) {
      const minutes = Math.round(limitSeconds / 60);
      throw new FeedbackRateLimited({
        message: `You've used your ${minutes} ${minutes === 1 ? "minute" : "minutes"} of reviewed speaking for today. Try again later.`,
      });
    }

    const [job] = await tx
      .insert(feedbackJobs)
      .values({
        attemptId: input.attemptId,
        input,
        stage: "queued",
        status: "queued",
        studentId,
      })
      // A double submit of the same attempt racing this one: return the
      // row that won (and don't count this one).
      .onConflictDoNothing()
      .returning();

    if (job !== undefined) {
      await tx.insert(feedbackRequests).values({
        spokenSeconds: Math.ceil(input.spokenSeconds),
        studentId,
      });
    }
    return job;
  });

  if (created === undefined) {
    return await submitFeedback(studentId, input);
  }

  return await startRun(created);
}

export async function getFeedbackJob(studentId: string, id: string) {
  const job = await findJob(studentId, id);

  return job === undefined ? null : toView(job);
}

// Cancels a running review and forgets the job (the desktop deleted its
// attempt). Returns false when there was no such job.
export async function deleteFeedbackJob(studentId: string, id: string) {
  const job = await findJob(studentId, id);

  if (job === undefined) {
    return false;
  }

  if (job.status === "queued" || job.status === "running") {
    try {
      await inngest.send(feedbackCancelled.create({ jobId: id }));
    } catch (error) {
      // The run finds its row gone and stops at the next step.
      console.error("[feedback] couldn't send feedback/cancelled", error);
    }
  }

  await db.delete(feedbackJobs).where(eq(feedbackJobs.id, id));

  return true;
}

// A browser-safe token for the job's realtime channel.
export async function createFeedbackSubscription(
  studentId: string,
  id: string
): Promise<FeedbackSubscription | null> {
  if ((await findJob(studentId, id)) === undefined) {
    return null;
  }

  const channel = feedbackChannel({ jobId: id });
  const token = await getClientSubscriptionToken(inngest, {
    channel,
    topics: ["status"],
  });

  return {
    apiBaseUrl: token.apiBaseUrl ?? null,
    channel: channel.name,
    key: token.key,
    topic: "status",
  };
}

// Used by the Inngest run.

// Marks the job running and returns it, or null when it's gone (deleted) or
// no longer wanted (cancelled).
export async function claimJob(id: string) {
  const [job] = await db
    .update(feedbackJobs)
    .set({ error: null, status: "running" })
    .where(
      and(
        eq(feedbackJobs.id, id),
        sql`${feedbackJobs.status} in ('queued', 'running', 'failed')`
      )
    )
    .returning();

  return job ?? null;
}

// Moves the job to the next stage. False when the job has been deleted.
export async function setStage(id: string, stage: FeedbackStage) {
  const rows = await db
    .update(feedbackJobs)
    .set({ stage })
    .where(eq(feedbackJobs.id, id))
    .returning({ id: feedbackJobs.id });

  return rows.length > 0;
}

export async function addUsage(
  id: string,
  { tokensIn, tokensOut }: { tokensIn: number; tokensOut: number }
) {
  await db
    .update(feedbackJobs)
    .set({
      tokensIn: sql`${feedbackJobs.tokensIn} + ${tokensIn}`,
      tokensOut: sql`${feedbackJobs.tokensOut} + ${tokensOut}`,
    })
    .where(eq(feedbackJobs.id, id));
}

export async function completeJob(id: string, result: FeedbackResult) {
  await db
    .update(feedbackJobs)
    .set({ error: null, result, stage: "done", status: "completed" })
    .where(eq(feedbackJobs.id, id));
}

export async function failJob(id: string, error: string) {
  await db
    .update(feedbackJobs)
    .set({ error, status: "failed" })
    .where(eq(feedbackJobs.id, id));
}

// Key points are shared by every student per topic and target length.
export async function findKeyPoints(topicId: string, targetSeconds: number) {
  const [row] = await db
    .select({ points: keyPoints.points })
    .from(keyPoints)
    .where(
      and(
        eq(keyPoints.topicId, topicId),
        eq(keyPoints.targetSeconds, targetSeconds)
      )
    )
    .limit(1);

  return row?.points ?? null;
}

export async function saveKeyPoints(
  topicId: string,
  targetSeconds: number,
  points: KeyPoint[],
  model: string
) {
  // The topic may have been deleted meanwhile; the review goes on uncached.
  try {
    await db
      .insert(keyPoints)
      .values({ model, points, targetSeconds, topicId })
      .onConflictDoNothing();
  } catch (error) {
    console.error("[feedback] couldn't cache key points", error);
  }
}
