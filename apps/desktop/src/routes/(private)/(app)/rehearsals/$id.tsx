import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";

import { rehearsalQueryOptions } from "@/modules/history/queries/rehearsals";
import {
  RehearsalNotFound,
  RehearsalPage,
} from "@/modules/rehearsal/pages/rehearsal-page";

export const Route = createFileRoute("/(private)/(app)/rehearsals/$id")({
  component: RehearsalPage,
  loader: async ({ context, params }) => {
    const rehearsal = await context.queryClient.query(
      rehearsalQueryOptions(context.session.student.id, params.id)
    );

    if (rehearsal === null) {
      throw notFound();
    }
  },
  notFoundComponent: RehearsalNotFound,
  // ?attempt=2 picks an attempt; without it the latest one is shown.
  validateSearch: z.object({
    attempt: z.number().int().positive().optional(),
  }),
});
