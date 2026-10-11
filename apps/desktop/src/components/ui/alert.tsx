import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type * as React from "react";

// Grid: [icon] [title / description] [action]. Icon and action span both text
// rows and center on them, so a one-line alert lines up on a single axis.
const alertVariants = cva(
  "group/alert grid w-full grid-cols-[minmax(0,1fr)] items-center gap-x-2.5 gap-y-0.5 rounded-lg px-3.5 py-3 text-left text-sm ring-1 ring-inset has-data-[slot=alert-action]:grid-cols-[minmax(0,1fr)_auto] has-[>svg]:grid-cols-[auto_minmax(0,1fr)] has-[>svg]:has-data-[slot=alert-action]:grid-cols-[auto_minmax(0,1fr)_auto] *:[svg]:row-span-2 *:[svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default:
          "bg-card text-card-foreground shadow-xs ring-border *:[svg]:text-muted-foreground",
        destructive:
          "bg-destructive/5 text-destructive ring-destructive/20 *:data-[slot=alert-description]:text-destructive/80 dark:bg-destructive/10 dark:ring-destructive/30 *:[svg]:text-destructive",
      },
    },
  }
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-1 font-medium text-pretty group-has-[>svg]/alert:col-start-2",
        className
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-1 text-sm text-pretty text-muted-foreground group-has-[>svg]/alert:col-start-2",
        className
      )}
      {...props}
    />
  );
}

// -my keeps an icon-xs button from making a one-line alert taller.
function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 -my-1 -mr-1.5 flex group-has-[>svg]/alert:col-start-3",
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
