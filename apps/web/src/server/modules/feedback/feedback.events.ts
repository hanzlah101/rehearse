import { eventType, realtime } from "inngest";
import { z } from "zod";

import { feedbackStatusSchema } from "@/server/modules/feedback/feedback.schemas";

// Starts a review run. The job row holds the input; the event only points to it.
export const feedbackRequested = eventType("feedback/requested", {
  schema: z.object({ jobId: z.uuid(), studentId: z.uuid() }),
});

// Cancels a running review (the desktop deleted the attempt).
export const feedbackCancelled = eventType("feedback/cancelled", {
  schema: z.object({ jobId: z.uuid() }),
});

// One channel per job; the desktop subscribes with a token from
// feedback.subscribe and hears every stage change.
export const feedbackChannel = realtime.channel({
  name: ({ jobId }: { jobId: string }) => `feedback:${jobId}`,
  topics: { status: { schema: feedbackStatusSchema } },
});
