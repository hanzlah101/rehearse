import { defineError } from "@/server/errors";

export const FeedbackRateLimited = defineError("FEEDBACK_RATE_LIMITED", {
  message: "You've used today's speaking time for reviews. Try again later.",
  status: 429,
});

export const FeedbackUnavailable = defineError("FEEDBACK_UNAVAILABLE", {
  message: "Reviews are unavailable right now. Try again in a minute.",
  status: 503,
});
