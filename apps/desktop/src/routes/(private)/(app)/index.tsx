import type { QueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { progressQueryOptions } from "@/modules/history/queries/rehearsals";
import { NewRehearsalPage } from "@/modules/rehearsal/pages/new-rehearsal-page";
import { topicsQueryOptions } from "@/modules/rehearsal/queries/topics";

// Starts loading without waiting: the page shows skeletons until each part
// is ready. Cached topics are used as is (the page refreshes them in the
// background). Failures surface when the page's own queries retry.
async function preload(queryClient: QueryClient, studentId: string) {
  try {
    await Promise.all([
      queryClient.query({ ...topicsQueryOptions, staleTime: "static" }),
      queryClient.query(progressQueryOptions(studentId)),
    ]);
  } catch {
    // Shown by the page.
  }
}

export const Route = createFileRoute("/(private)/(app)/")({
  component: NewRehearsalPage,
  loader: ({ context }) => {
    void preload(context.queryClient, context.session.student.id);
  },
});
