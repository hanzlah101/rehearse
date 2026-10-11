import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SessionPage } from "@/modules/session/pages/session-page";

export const Route = createFileRoute("/(private)/session")({
  component: SessionPage,
  // A retry passes the rehearsal it belongs to; a new topic has none yet.
  validateSearch: z.object({
    minutes: z.number().int().positive(),
    rehearsal: z.string().optional(),
    set: z.string(),
    topic: z.string().min(1),
  }),
});
