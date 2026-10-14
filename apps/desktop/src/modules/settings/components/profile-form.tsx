import { updateProfileInputSchema } from "@server/modules/auth/auth.schemas";
import { revalidateLogic, useSelector } from "@tanstack/react-form";
import { Text, TextField } from "react-aria-components";

import {
  Form,
  FormAlert,
  FormError,
  FormField,
  FormLabel,
  FormSubmit,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppForm } from "@/hooks/use-form";
import { useUpdateProfile } from "@/modules/auth/actions/update-profile";
import { StudentAvatar } from "@/modules/auth/components/student-avatar";
import { useSession } from "@/modules/auth/queries/session";

// The name can change; the student ID is shown read-only (the school assigns
// it and it's how the student logs in).
export function ProfileForm() {
  const { student } = useSession();
  const updateProfile = useUpdateProfile();
  const form = useAppForm({
    defaultValues: { name: student.name },
    onSubmit: ({ value }) => {
      updateProfile.mutate(value);
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: updateProfileInputSchema },
  });
  const isChanged = useSelector(
    form.store,
    (state) => state.values.name.trim() !== student.name
  );

  return (
    <form.AppForm>
      <Form isPending={updateProfile.isPending}>
        <FormAlert mutation={updateProfile} />

        <div className="flex items-center gap-4">
          <StudentAvatar name={student.name} size={56} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-heading text-lg font-semibold">
              {student.name}
            </span>
            <span className="text-sm text-muted-foreground">
              Your avatar is drawn from your name.
            </span>
          </div>
        </div>

        <form.AppField name="name">
          {() => (
            <FormField>
              <FormLabel>Name</FormLabel>
              <Input autoComplete="name" />
              <FormError />
            </FormField>
          )}
        </form.AppField>

        <TextField
          className="flex flex-col gap-2"
          isReadOnly
          value={student.studentId}
        >
          <Label>Student ID</Label>
          <Input />
          <Text className="text-sm text-muted-foreground" slot="description">
            You log in with it, so it can’t be changed.
          </Text>
        </TextField>

        <FormSubmit className="self-end" isDisabled={!isChanged}>
          Save
        </FormSubmit>
      </Form>
    </form.AppForm>
  );
}
