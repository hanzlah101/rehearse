import { inngest } from "@/server/inngest";
import {
  checkContent,
  generateKeyPoints,
  reviewLanguage,
  rewriteSentences,
} from "@/server/modules/feedback/feedback.ai";
import type { Usage } from "@/server/modules/feedback/feedback.ai";
import { FEEDBACK_START_TIMEOUT } from "@/server/modules/feedback/feedback.constants";
import {
  feedbackCancelled,
  feedbackChannel,
  feedbackRequested,
} from "@/server/modules/feedback/feedback.events";
import {
  limitsFor,
  rewriteChunks,
} from "@/server/modules/feedback/feedback.prompts";
import type {
  FeedbackJobStatus,
  FeedbackStage,
} from "@/server/modules/feedback/feedback.schemas";
import {
  addUsage,
  claimJob,
  completeJob,
  failJob,
  findKeyPoints,
  saveKeyPoints,
  setStage,
} from "@/server/modules/feedback/feedback.service";

const FAILED_MESSAGE = "The review couldn't be finished. Try again.";

async function recordUsage(jobId: string, usage: Usage) {
  try {
    await addUsage(jobId, usage);
  } catch (error) {
    console.error("[feedback] couldn't record usage", error);
  }
}

// Reviews one attempt: key points (cached per topic and length), then the
// language call with the better version's rewrites alongside it, then the
// content check, each a durable step retried on its
// own with backoff (the smaller model takes over after two failures). Stage
// changes go to the job row (for polling) and the realtime channel (live).
// Runs on Inngest, so it finishes even if the desktop goes offline.
export const reviewAttempt = inngest.createFunction(
  {
    cancelOn: [
      {
        event: feedbackCancelled.name,
        if: "event.data.jobId == async.data.jobId",
      },
    ],
    concurrency: [{ key: "event.data.studentId", limit: 2 }],
    id: "review-attempt",
    onFailure: async ({ error, event, step }) => {
      const { jobId } = feedbackRequested.schema.parse(event.data.event.data);
      console.error(`[feedback] review ${jobId} failed`, error);
      await step.run("mark-failed", async () => {
        await failJob(jobId, FAILED_MESSAGE);
      });
      await step.realtime.publish(
        "publish-failed",
        feedbackChannel({ jobId }).status,
        { error: FAILED_MESSAGE, stage: "done", status: "failed" }
      );
    },
    retries: 4,
    timeouts: { finish: "15m", start: FEEDBACK_START_TIMEOUT },
    triggers: [feedbackRequested],
  },
  async ({ attempt, event, step }) => {
    const { jobId } = event.data;
    const channel = feedbackChannel({ jobId });

    // Records the stage on the row (for polling) and the channel (live).
    // False when the job was deleted meanwhile (the student deleted the
    // attempt): the run then stops quietly.
    async function advance(stage: FeedbackStage, status: FeedbackJobStatus) {
      const exists = await step.run(`stage-${stage}`, async () =>
        stage === "done" ? true : await setStage(jobId, stage)
      );
      if (exists) {
        await step.realtime.publish(`publish-${stage}`, channel.status, {
          error: null,
          stage,
          status,
        });
      }
      return exists;
    }

    const job = await step.run("claim", async () => {
      const claimed = await claimJob(jobId);
      return claimed === null ? null : claimed.input;
    });

    if (job === null || !(await advance("key_points", "running"))) {
      return { skipped: true };
    }

    const input = job;
    const keyPoints = await step.run("key-points", async () => {
      const cached =
        input.topicId === null
          ? null
          : await findKeyPoints(input.topicId, input.targetSeconds);
      if (cached !== null) {
        return cached;
      }
      const generated = await generateKeyPoints(input, attempt);
      await recordUsage(jobId, generated.usage);
      if (input.topicId !== null) {
        await saveKeyPoints(
          input.topicId,
          input.targetSeconds,
          generated.keyPoints,
          generated.model
        );
      }
      return generated.keyPoints;
    });

    if (!(await advance("language", "running"))) {
      return { skipped: true };
    }

    // Call A and the better version's rewrites, in parallel. The rewrites
    // are one small step per group of sentences, so no answer outgrows the
    // model's output budget however long the talk is; each step retries on
    // its own.
    const [reviewed, rewrites] = await Promise.all([
      step.run("language", async () => {
        const result = await reviewLanguage(input, keyPoints, attempt);
        await recordUsage(jobId, result.usage);
        return { language: result.language, model: result.model };
      }),
      Promise.all(
        rewriteChunks(input.sentences).map(
          async (chunk, index) =>
            await step.run(`rewrite-${index + 1}`, async () => {
              const result = await rewriteSentences(
                input.topic,
                chunk,
                attempt
              );
              await recordUsage(jobId, result.usage);
              return result.rephrasings;
            })
        )
      ),
    ]);
    const language = {
      language: {
        ...reviewed.language,
        rephrasings: rewrites
          .flat()
          .slice(0, limitsFor(input.spokenSeconds).rephrasings),
      },
      model: reviewed.model,
    };

    if (!(await advance("content", "running"))) {
      return { skipped: true };
    }

    const content = await step.run("content", async () => {
      const checked = await checkContent(input, keyPoints, attempt);
      await recordUsage(jobId, checked.usage);
      return checked.content;
    });

    await step.run("complete", async () => {
      await completeJob(jobId, {
        content,
        keyPoints,
        language: language.language,
        model: language.model,
      });
    });
    await advance("done", "completed");

    return { completed: true };
  }
);

export const functions = [reviewAttempt];
