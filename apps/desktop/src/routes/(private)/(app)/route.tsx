import { createFileRoute } from "@tanstack/react-router";

import { AppLayout } from "@/modules/common/components/app-layout";
import { rehearsalsQueryOptions } from "@/modules/history/queries/rehearsals";
import { requireMicrophone } from "@/modules/onboarding/lib/microphone";

export const Route = createFileRoute("/(private)/(app)")({
  beforeLoad: requireMicrophone,
  component: AppLayout,
  // The history sidebar reads this list.
  loader: async ({ context }) => {
    await context.queryClient.query(
      rehearsalsQueryOptions(context.session.student.id)
    );
  },
});
