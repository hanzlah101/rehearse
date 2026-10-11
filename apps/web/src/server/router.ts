import { authRouter } from "@/server/modules/auth/auth.router";
import { topicsRouter } from "@/server/modules/topics/topics.router";

export const router = {
  auth: authRouter,
  topics: topicsRouter,
};

export type AppRouter = typeof router;
