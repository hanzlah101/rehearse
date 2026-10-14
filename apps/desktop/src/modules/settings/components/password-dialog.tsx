import { changePasswordInputSchema } from "@server/modules/auth/auth.schemas";
import { IconLockFilled } from "@tabler/icons-react";
import { revalidateLogic } from "@tanstack/react-form";
import { useContext } from "react";
import { OverlayTriggerStateContext } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormAlert,
  FormDescription,
  FormError,
  FormField,
  FormLabel,
  FormSubmit,
} from "@/components/ui/form";
import { PasswordField } from "@/components/ui/password-field";
import { useAppForm } from "@/hooks/use-form";
import { useChangePassword } from "@/modules/auth/actions/change-password";

// The server's rules (at least 8 characters, not the current password) plus
// the confirmation, which never leaves the form.
const passwordFormSchema = changePasswordInputSchema
  .and(z.object({ confirmPassword: z.string() }))
  .refine((input) => input.confirmPassword === input.newPassword, {
    error: "Passwords don’t match.",
    path: ["confirmPassword"],
  });

// Mounted only while the dialog is open, so it always starts blank. Closes on
// success; a failure (e.g. a wrong current password) shows in the form.
function PasswordForm() {
  const dialog = useContext(OverlayTriggerStateContext);
  const changePassword = useChangePassword();
  const form = useAppForm({
    defaultValues: {
      confirmPassword: "",
      currentPassword: "",
      newPassword: "",
    },
    onSubmit: ({ value: { currentPassword, newPassword } }) => {
      changePassword.mutate(
        { currentPassword, newPassword },
        { onSuccess: () => dialog?.close() }
      );
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: passwordFormSchema },
  });

  return (
    <form.AppForm>
      <Form isPending={changePassword.isPending}>
        <FormAlert mutation={changePassword} />

        <form.AppField name="currentPassword">
          {() => (
            <FormField>
              <FormLabel>Current password</FormLabel>
              <PasswordField autoComplete="current-password" autoFocus />
              <FormError />
            </FormField>
          )}
        </form.AppField>

        <form.AppField name="newPassword">
          {() => (
            <FormField>
              <FormLabel>New password</FormLabel>
              <PasswordField autoComplete="new-password" />
              <FormDescription>At least 8 characters.</FormDescription>
              <FormError />
            </FormField>
          )}
        </form.AppField>

        <form.AppField name="confirmPassword">
          {() => (
            <FormField>
              <FormLabel>Confirm new password</FormLabel>
              <PasswordField autoComplete="new-password" />
              <FormError />
            </FormField>
          )}
        </form.AppField>

        <DialogFooter>
          <DialogClose isDisabled={changePassword.isPending}>
            Cancel
          </DialogClose>
          <FormSubmit>Change password</FormSubmit>
        </DialogFooter>
      </Form>
    </form.AppForm>
  );
}

export function PasswordDialog() {
  return (
    <DialogTrigger>
      <Button className="self-start" variant="outline">
        <IconLockFilled data-icon="inline-start" />
        Change password
      </Button>
      <Dialog>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Enter your current password, then the new one twice. Other devices
            will be signed out.
          </DialogDescription>
        </DialogHeader>
        <PasswordForm />
      </Dialog>
    </DialogTrigger>
  );
}
