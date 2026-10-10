import { exampleRouter } from "@/server/modules/example/example.router";

export const router = {
  example: exampleRouter,
};

export type AppRouter = typeof router;
