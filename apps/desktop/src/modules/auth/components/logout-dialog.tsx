import { IconLogout } from "@tabler/icons-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/modules/auth/actions/logout";

// Log out button that confirms first. Success navigates to /login (which
// unmounts this); a failure toasts and leaves the dialog open to retry.
export function LogoutDialog() {
  const logout = useLogout();

  return (
    <AlertDialogTrigger>
      <Button aria-label="Log out" size="icon-sm" variant="ghost">
        <IconLogout />
      </Button>
      <AlertDialog isKeyboardDismissDisabled={logout.isPending}>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <IconLogout />
          </AlertDialogMedia>
          <AlertDialogTitle>Log out?</AlertDialogTitle>
          <AlertDialogDescription>
            You’ll need your student ID and password to log back in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel isDisabled={logout.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            isLoading={logout.isPending}
            onPress={() => {
              logout.mutate();
            }}
            variant="destructive"
          >
            Log out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </AlertDialogTrigger>
  );
}
