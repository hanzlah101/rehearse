import { authRouter } from "@/server/modules/auth/auth.router";

export const router = {
  auth: authRouter,
};

export type AppRouter = typeof router;
