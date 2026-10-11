import { cn } from "cn";
import type * as React from "react";
import {
  composeRenderProps,
  TextArea as TextareaPrimitive,
} from "react-aria-components";

function Textarea({
  className,
  ...props
}: React.ComponentProps<typeof TextareaPrimitive>) {
  return (
    <TextareaPrimitive
      data-slot="textarea"
      className={composeRenderProps(className, (renderClassName) =>
        cn(
          "flex field-sizing-content min-h-16 w-full rounded-lg bg-card px-3 py-2 text-sm text-foreground shadow-xs ring-1 ring-input outline-hidden transition-shadow duration-100 ease-linear ring-inset placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-invalid:ring-destructive/50 data-invalid:focus:ring-destructive dark:bg-input/30",
          renderClassName
        )
      )}
      {...props}
    />
  );
}

export { Textarea };
