import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/modules/common/lib/orpc";

// Failures are shown by the password dialog's <FormAlert mutation={…} />.
export function useChangePassword() {
  return useMutation(
    orpc.auth.changePassword.mutationOptions({
      onSuccess: () => {
        toast.success("Password changed.", {
          description: "You were signed out everywhere else.",
        });
      },
    })
  );
}
