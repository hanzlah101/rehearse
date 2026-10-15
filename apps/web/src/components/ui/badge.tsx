import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type * as React from "react";

// A small pill for a status next to a name, e.g. "Beta" beside the logo.
const badgeVariants = cva(
  "inline-flex shrink-0 items-center rounded-full px-2 text-xs leading-5 font-semibold whitespace-nowrap",
  {
    defaultVariants: {
      variant: "primary",
    },
    variants: {
      variant: {
        primary:
          "bg-primary/10 text-primary ring-1 ring-primary/25 ring-inset dark:bg-primary/20",
      },
    },
  }
);

function Badge({
  className,
  variant = "primary",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      className={cn(badgeVariants({ className, variant }))}
      data-slot="badge"
      {...props}
    />
  );
}

export { Badge, badgeVariants };
