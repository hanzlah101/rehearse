import { defineError } from "@/server/errors";
import { FEEDBACK_DAILY_LIMIT } from "@/server/modules/feedback/feedback.constants";

export const FeedbackRateLimited = defineError("FEEDBACK_RATE_LIMITED", {
  message: `You've reached today's limit of ${FEEDBACK_DAILY_LIMIT} reviews. Try again tomorrow.`,
  status: 429,
});

export const FeedbackUnavailable = defineError("FEEDBACK_UNAVAILABLE", {
  message: "Reviews are unavailable right now. Try again in a minute.",
  status: 503,
});
