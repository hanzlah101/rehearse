import { safe } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";

import { cancelAnalysis } from "@/modules/analysis/lib/runner";
import { useSession } from "@/modules/auth/queries/session";
import { getErrorMessage } from "@/modules/common/lib/errors";
import { api } from "@/modules/common/lib/orpc";
import {
  deleteRehearsal,
  listRehearsalAttempts,
} from "@/modules/history/lib/rehearsals";
import { LOCAL_QUERY_KEY } from "@/modules/history/queries/rehearsals";

// Deletes a rehearsal completely (PLAN §9: students can delete attempts, audio
// and data): stops any analysis, deletes rows and files on this computer,
// then the server's reviews (best effort; a review whose deletion fails only
// keeps its text there, never audio).
export function useDeleteRehearsal() {
  const { student } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const openId = useParams({ select: (params) => params.id, strict: false });

  return useMutation({
    mutationFn: async (id: string) => {
      const attempts = await listRehearsalAttempts(student.id, id);
      await Promise.all(
        attempts.map(async (attempt) => {
          await cancelAnalysis(attempt.id);
        })
      );
      await deleteRehearsal(student.id, id);
      await Promise.all(
        attempts.map(async ({ feedbackJobId }) => {
          if (feedbackJobId !== null) {
            await safe(api.feedback.remove({ id: feedbackJobId }));
          }
        })
      );
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Couldn't delete this rehearsal. Try again.")
      );
    },
    onSuccess: async (_, id) => {
      if (openId === id) {
        void navigate({ replace: true, to: "/" });
      }
      await queryClient.invalidateQueries({ queryKey: LOCAL_QUERY_KEY });
    },
  });
}
