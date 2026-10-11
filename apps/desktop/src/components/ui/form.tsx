import { IconAlertCircleFilled, IconX } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-form";
import type { UseMutationResult } from "@tanstack/react-query";
import { cn } from "cn";
import * as React from "react";
import {
  composeRenderProps,
  FieldError as FieldErrorPrimitive,
  Form as FormPrimitive,
  Text,
  TextField,
} from "react-aria-components";
import type {
  FieldErrorProps,
  FormProps,
  TextFieldProps,
} from "react-aria-components";

import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useFieldContext, useFormContext } from "@/hooks/use-form";
import { getErrorMessage } from "@/modules/common/lib/errors";

// True while the mutation behind the form is in flight. onSubmit calls
// `mutate` (not `mutateAsync`), so the form's own isSubmitting ends as soon as
// validation does; this keeps fields disabled and the submit button spinning
// until the request settles.
const FormPendingContext = React.createContext(false);

function errorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return null;
}

function Form({
  className,
  isPending = false,
  ...props
}: Omit<FormProps, "onSubmit"> & { isPending?: boolean }) {
  const form = useFormContext();

  return (
    <FormPendingContext.Provider value={isPending}>
      <FormPrimitive
        data-slot="form"
        className={cn("flex flex-col gap-5", className)}
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
        validationBehavior="aria"
        {...props}
      />
    </FormPendingContext.Provider>
  );
}

// A text control (Input, PasswordField) bound to the surrounding form.AppField.
function FormField({
  className,
  ...props
}: Omit<
  TextFieldProps,
  "isInvalid" | "name" | "onBlur" | "onChange" | "value"
>) {
  const field = useFieldContext<string>();
  const value = useSelector(field.store, (state) => state.value);
  const isInvalid = useSelector(
    field.store,
    (state) => state.meta.isTouched && !state.meta.isValid
  );
  const isSubmitting = useSelector(
    field.form.store,
    (state) => state.isSubmitting
  );
  const isPending = React.useContext(FormPendingContext);

  return (
    <TextField
      data-slot="form-field"
      className={composeRenderProps(className, (renderClassName) =>
        cn("group/form-field flex flex-col gap-2", renderClassName)
      )}
      isDisabled={isSubmitting || isPending}
      isInvalid={isInvalid}
      name={field.name}
      onBlur={field.handleBlur}
      onChange={field.handleChange}
      value={value}
      {...props}
    />
  );
}

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="form-label"
      className={cn(
        "group-data-invalid/form-field:text-destructive group-data-disabled/form-field:opacity-50",
        className
      )}
      {...props}
    />
  );
}

function FormDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="form-description"
      slot="description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function FormError({ className, ...props }: Omit<FieldErrorProps, "children">) {
  const field = useFieldContext<string>();
  const message = useSelector(field.store, (state) =>
    errorMessage(state.meta.errors[0])
  );

  return (
    <FieldErrorPrimitive
      data-slot="form-error"
      className={composeRenderProps(className, (renderClassName) =>
        cn("text-sm text-destructive", renderClassName)
      )}
      {...props}
    >
      {message}
    </FieldErrorPrimitive>
  );
}

// The submit mutation's failure, shown at the top of the form until it's
// dismissed (reset) or the next submit starts a new attempt.
function FormAlert({
  className,
  mutation,
  ...props
}: Omit<React.ComponentProps<typeof Alert>, "children" | "variant"> & {
  mutation: Pick<UseMutationResult, "error" | "reset">;
}) {
  if (mutation.error === null) {
    return null;
  }

  return (
    <Alert
      data-slot="form-alert"
      variant="destructive"
      className={className}
      {...props}
    >
      <IconAlertCircleFilled />
      <AlertTitle>{getErrorMessage(mutation.error)}</AlertTitle>
      <AlertAction>
        <Button
          aria-label="Dismiss"
          onPress={() => {
            mutation.reset();
          }}
          size="icon-xs"
          variant="destructive-ghost"
        >
          <IconX />
        </Button>
      </AlertAction>
    </Alert>
  );
}

function FormSubmit(props: React.ComponentProps<typeof Button>) {
  const form = useFormContext();
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
  const isPending = React.useContext(FormPendingContext);

  return (
    <Button isLoading={isSubmitting || isPending} type="submit" {...props} />
  );
}

export {
  Form,
  FormAlert,
  FormField,
  FormLabel,
  FormDescription,
  FormError,
  FormSubmit,
};
