import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

import { formatPercent } from "@/lib/format";
import {
  startAnalysisRunner,
  stopAnalysisRunner,
} from "@/modules/analysis/lib/runner";
import { useSession } from "@/modules/auth/queries/session";

// Runs the background analysis for the logged-in student (resuming anything
// left unfinished) and stops it on logout. Announces finished feedback unless
// the student is already looking at it.
export function AnalysisRunner() {
  const { student } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    void startAnalysisRunner({
      onReady: (attempt, score) => {
        const { pathname } = router.state.location;
        if (
          pathname === `/rehearsals/${attempt.rehearsalId}` ||
          pathname === "/session"
        ) {
          return;
        }
        toast.success(`Feedback ready: ${formatPercent(score)}`, {
          action: {
            label: "View",
            onClick: () => {
              void router.navigate({
                params: { id: attempt.rehearsalId },
                to: "/rehearsals/$id",
              });
            },
          },
          description: attempt.topic,
        });
      },
      queryClient,
      studentId: student.id,
    });
    return () => {
      stopAnalysisRunner();
    };
  }, [queryClient, router, student.id]);

  return null;
}
