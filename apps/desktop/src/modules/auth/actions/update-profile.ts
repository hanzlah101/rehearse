import type { Session } from "@server/modules/auth/auth.schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

import { sessionQueryOptions } from "@/modules/auth/queries/session";
import { orpc } from "@/modules/common/lib/orpc";

// Failures are shown by the profile form's <FormAlert mutation={…} />. The
// session lives in the router context (useSession), so the cached session is
// updated and the router re-runs beforeLoad to pick up the new name.
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation(
    orpc.auth.updateProfile.mutationOptions({
      onSuccess: async (student) => {
        queryClient.setQueryData(
          sessionQueryOptions.queryKey,
          (session: Session | null | undefined) =>
            session === null || session === undefined
              ? session
              : { ...session, student }
        );
        await router.invalidate();
        toast.success("Name saved.");
      },
    })
  );
}
