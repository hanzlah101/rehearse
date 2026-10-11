import { isDefinedError } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { match } from "ts-pattern";

import { sessionQueryOptions } from "@/modules/auth/queries/session";
import { getErrorMessage } from "@/modules/common/lib/errors";
import { orpc } from "@/modules/common/lib/orpc";

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation(
    orpc.auth.login.mutationOptions({
      onError: (error) => {
        const errorMessage = getErrorMessage(
          error,
          "Couldn't log in. Check your connection and try again."
        );

        if (!isDefinedError(error)) {
          toast.error(errorMessage);
          return;
        }

        match(error.code)
          .with(
            "AUTH_INVALID_CREDENTIALS",
            "UNPROCESSABLE_CONTENT",
            "BAD_REQUEST",
            "INTERNAL_SERVER_ERROR",
            () => toast.error(error.message)
          )
          .exhaustive(() => toast.error(errorMessage));
      },
      onSuccess: (session) => {
        queryClient.setQueryData(sessionQueryOptions.queryKey, session);
        void navigate({ replace: true, to: "/" });
      },
    })
  );
}
