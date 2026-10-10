import { cn } from "cn";
import type * as React from "react";
import {
  composeRenderProps,
  Input as InputPrimitive,
} from "react-aria-components";

function Input({
  className,
  type,
  ...props
}: React.ComponentProps<typeof InputPrimitive>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={composeRenderProps(className, (renderClassName) =>
        cn(
          "h-10 w-full min-w-0 rounded-lg bg-card px-3 text-sm text-foreground shadow-xs ring-1 ring-input outline-hidden transition-shadow duration-100 ease-linear ring-inset file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-invalid:ring-destructive/50 data-invalid:focus:ring-destructive dark:bg-input/30",
          renderClassName
        )
      )}
      {...props}
    />
  );
}

export { Input };
