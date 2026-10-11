import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { requireMicrophone } from "@/modules/onboarding/lib/microphone";
import { SessionPage } from "@/modules/session/pages/session-page";

export const Route = createFileRoute("/(private)/session")({
  beforeLoad: requireMicrophone,
  component: SessionPage,
  // A retry passes the rehearsal it belongs to; a new topic has none yet.
  // topicId links the attempt to its server topic once threads are stored.
  validateSearch: z.object({
    minutes: z.number().int().positive(),
    rehearsal: z.string().optional(),
    topic: z.string().min(1),
    topicId: z.uuid().optional(),
  }),
});
