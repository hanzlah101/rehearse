import { loginInputSchema } from "@server/modules/auth/auth.schemas";
import { revalidateLogic } from "@tanstack/react-form";

import {
  Form,
  FormError,
  FormField,
  FormLabel,
  FormSubmit,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";
import { useAppForm } from "@/hooks/use-form";
import { useLogin } from "@/modules/auth/actions/login";

export function LoginForm() {
  const login = useLogin();

  const form = useAppForm({
    defaultValues: {
      password: "",
      studentId: "",
    },
    onSubmit: ({ value }) => {
      login.mutate(value);
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: loginInputSchema },
  });

  return (
    <form.AppForm>
      <Form isPending={login.isPending}>
        <form.AppField name="studentId">
          {() => (
            <FormField autoComplete="username">
              <FormLabel>Student ID</FormLabel>
              <Input placeholder="STU-001" />
              <FormError />
            </FormField>
          )}
        </form.AppField>

        <form.AppField name="password">
          {() => (
            <FormField autoComplete="current-password">
              <FormLabel>Password</FormLabel>
              <PasswordField />
              <FormError />
            </FormField>
          )}
        </form.AppField>

        <FormSubmit size="lg">Log in</FormSubmit>
      </Form>
    </form.AppForm>
  );
}
