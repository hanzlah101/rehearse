import { createFileRoute } from "@tanstack/react-router";

import { progressQueryOptions } from "@/modules/history/queries/rehearsals";
import { NewRehearsalPage } from "@/modules/rehearsal/pages/new-rehearsal-page";
import { topicsQueryOptions } from "@/modules/rehearsal/queries/topics";

export const Route = createFileRoute("/(private)/(app)/")({
  component: NewRehearsalPage,
  loader: async ({ context }) => {
    // Use the cached list if there is one (the page refreshes it in the
    // background); otherwise wait for it before rendering.
    await Promise.all([
      context.queryClient.query({ ...topicsQueryOptions, staleTime: "static" }),
      context.queryClient.query(
        progressQueryOptions(context.session.student.id)
      ),
    ]);
  },
});
