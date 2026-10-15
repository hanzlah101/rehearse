import { openapi } from "@orpc/openapi";

import { inputValidation } from "@/server/core/input-validation";
import { Forbidden, NotFound } from "@/server/errors";
import {
  FeedbackRateLimited,
  FeedbackUnavailable,
} from "@/server/modules/feedback/feedback.errors";
import {
  canRerunFeedback,
  feedbackJobParamsSchema,
  feedbackJobSchema,
  feedbackSubscriptionSchema,
  feedbackUsageSchema,
  submitFeedbackInputSchema,
} from "@/server/modules/feedback/feedback.schemas";
import {
  createFeedbackSubscription,
  deleteFeedbackJob,
  getFeedbackJob,
  getFeedbackUsage,
  submitFeedback,
} from "@/server/modules/feedback/feedback.service";
import { protectedOS } from "@/server/orpc";

const TAGS = ["Feedback"];

const submit = protectedOS
  .meta(
    openapi({
      description:
        "Starts the AI review of an attempt the desktop transcribed and measured. Runs in the background; follow it with the subscription or by polling. Submitting the same attempt again returns its job (a failed one starts over; with `rerun`, students with the re-run flag start a finished one over).",
      method: "POST",
      path: "/feedback",
      successStatus: 202,
      summary: "Request feedback",
      tags: TAGS,
    })
  )
  .use(inputValidation)
  .input(submitFeedbackInputSchema)
  .output(feedbackJobSchema)
  .errors({
    [FeedbackRateLimited.code]: FeedbackRateLimited,
    [FeedbackUnavailable.code]: FeedbackUnavailable,
  })
  .handler(async ({ context, input }) => {
    const { student } = context.session;
    if (input.rerun && !canRerunFeedback(student.studentId)) {
      throw new Forbidden({
        message: "Re-running reviews isn't enabled for you.",
      });
    }
    return await submitFeedback(student.id, input);
  });

const usage = protectedOS
  .meta(
    openapi({
      description:
        "Speaking time sent for review in the last 24 hours and the student's limit. New reviews are refused while the limit is used up.",
      method: "GET",
      path: "/feedback/usage",
      summary: "Get review usage",
      tags: TAGS,
    })
  )
  .output(feedbackUsageSchema)
  .handler(
    async ({ context }) => await getFeedbackUsage(context.session.student.id)
  );

const get = protectedOS
  .meta(
    openapi({
      description:
        "The review's status and stage, with the result once it's completed.",
      method: "GET",
      path: "/feedback/{id}",
      summary: "Get feedback",
      tags: TAGS,
    })
  )
  .use(inputValidation)
  .input(feedbackJobParamsSchema)
  .output(feedbackJobSchema)
  .errors({ [NotFound.code]: NotFound })
  .handler(async ({ context, input }) => {
    const job = await getFeedbackJob(context.session.student.id, input.id);

    if (job === null) {
      throw new NotFound({ message: "This review doesn't exist." });
    }

    return job;
  });

const subscribe = protectedOS
  .meta(
    openapi({
      description:
        "A short-lived token for the review's realtime channel, which publishes every stage change.",
      method: "POST",
      path: "/feedback/{id}/subscription",
      summary: "Subscribe to feedback",
      tags: TAGS,
    })
  )
  .use(inputValidation)
  .input(feedbackJobParamsSchema)
  .output(feedbackSubscriptionSchema)
  .errors({
    [FeedbackUnavailable.code]: FeedbackUnavailable,
    [NotFound.code]: NotFound,
  })
  .handler(async ({ context, input }) => {
    let subscription: Awaited<ReturnType<typeof createFeedbackSubscription>>;

    try {
      subscription = await createFeedbackSubscription(
        context.session.student.id,
        input.id
      );
    } catch (error) {
      console.error("[feedback] couldn't create a subscription token", error);
      throw new FeedbackUnavailable();
    }

    if (subscription === null) {
      throw new NotFound({ message: "This review doesn't exist." });
    }

    return subscription;
  });

const remove = protectedOS
  .meta(
    openapi({
      description:
        "Cancels the review if it's still running and deletes it. Deleting a review that doesn't exist succeeds too.",
      method: "DELETE",
      path: "/feedback/{id}",
      successStatus: 204,
      summary: "Delete feedback",
      tags: TAGS,
    })
  )
  .use(inputValidation)
  .input(feedbackJobParamsSchema)
  .handler(async ({ context, input }) => {
    await deleteFeedbackJob(context.session.student.id, input.id);
  });

export const feedbackRouter = { get, remove, submit, subscribe, usage };
