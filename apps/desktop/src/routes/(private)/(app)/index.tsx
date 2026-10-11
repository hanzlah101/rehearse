import { createFileRoute } from "@tanstack/react-router";

import { NewRehearsalPage } from "@/modules/rehearsal/pages/new-rehearsal-page";
import { topicsQueryOptions } from "@/modules/rehearsal/queries/topics";

export const Route = createFileRoute("/(private)/(app)/")({
  component: NewRehearsalPage,
  loader: async ({ context }) => {
    // Use the cached list if there is one (the page refreshes it in the
    // background); otherwise wait for it before rendering.
    await context.queryClient.query({
      ...topicsQueryOptions,
      staleTime: "static",
    });
  },
});
