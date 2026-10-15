import { isDefinedError } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { match } from "ts-pattern";

import { clearToken } from "@/modules/auth/lib/token";
import { sessionQueryOptions } from "@/modules/auth/queries/session";
import { getErrorMessage } from "@/modules/common/lib/errors";
import { orpc } from "@/modules/common/lib/orpc";

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation(
    orpc.auth.logout.mutationOptions({
      onError: (error) => {
        const errorMessage = getErrorMessage(
          error,
          "Couldn't log out. Check your connection and try again."
        );

        if (!isDefinedError(error)) {
          toast.error(errorMessage);
          return;
        }

        match(error.code)
          .with("BAD_REQUEST", "INTERNAL_SERVER_ERROR", () =>
            toast.error(error.message)
          )
          .exhaustive(() => toast.error(errorMessage));
      },
      onSuccess: async () => {
        // The server has revoked the session, so sign out here even if the
        // stored token can't be deleted; it no longer works anyway.
        await clearToken().catch(() => {
          toast.error(
            "Logged out, but couldn't remove your saved sign-in from this computer."
          );
        });
        // Drop everything cached for the previous student.
        queryClient.clear();
        queryClient.setQueryData(sessionQueryOptions.queryKey, null);
        void navigate({ replace: true, to: "/login" });
      },
    })
  );
}
