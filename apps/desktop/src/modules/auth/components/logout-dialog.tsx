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
} from "@/components/ui/alert-dialog";
import { useLogout } from "@/modules/auth/actions/logout";

// Confirms logging out; opened from the sidebar's account menu. Success
// navigates to /login (which unmounts this); a failure toasts and leaves the
// dialog open to retry.
export function LogoutDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const logout = useLogout();

  return (
    <AlertDialog
      isKeyboardDismissDisabled={logout.isPending}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
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
  );
}
