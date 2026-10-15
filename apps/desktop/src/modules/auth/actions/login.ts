import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { setToken } from "@/modules/auth/lib/token";
import { sessionQueryOptions } from "@/modules/auth/queries/session";
import { orpc } from "@/modules/common/lib/orpc";

// Failures are shown by the login form's <FormAlert mutation={login} />.
export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation(
    orpc.auth.login.mutationOptions({
      // The token goes to the OS credential store, never into the cache.
      onSuccess: async ({ token, ...session }) => {
        await setToken(token);
        queryClient.setQueryData(sessionQueryOptions.queryKey, session);
        void navigate({ replace: true, to: "/" });
      },
    })
  );
}
