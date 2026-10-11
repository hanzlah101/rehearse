import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";

import { getRehearsal } from "@/modules/history/lib/rehearsals";
import {
  RehearsalNotFound,
  RehearsalPage,
} from "@/modules/rehearsal/pages/rehearsal-page";

export const Route = createFileRoute("/(private)/(app)/rehearsals/$id")({
  component: RehearsalPage,
  loader: ({ params }) => {
    const rehearsal = getRehearsal(params.id);

    if (rehearsal === undefined) {
      throw notFound();
    }

    return rehearsal;
  },
  notFoundComponent: RehearsalNotFound,
  // ?attempt=2 picks an attempt; without it the latest one is shown.
  validateSearch: z.object({
    attempt: z.number().int().positive().optional(),
  }),
});
