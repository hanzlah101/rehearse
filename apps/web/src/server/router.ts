import { authRouter } from "@/server/modules/auth/auth.router";
import { feedbackRouter } from "@/server/modules/feedback/feedback.router";
import { topicsRouter } from "@/server/modules/topics/topics.router";

export const router = {
  auth: authRouter,
  feedback: feedbackRouter,
  topics: topicsRouter,
};

export type AppRouter = typeof router;
