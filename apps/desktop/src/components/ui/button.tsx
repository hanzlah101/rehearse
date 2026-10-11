import { IconLoader2 } from "@tabler/icons-react";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type * as React from "react";
import {
  Button as ButtonPrimitive,
  composeRenderProps,
} from "react-aria-components";
import type { ButtonProps as ButtonPrimitiveProps } from "react-aria-components";

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap outline-hidden transition-[background-color,box-shadow,color,scale] duration-300 ease-out select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:pointer-events-none disabled:opacity-50 aria-invalid:outline-destructive data-pressed:not-aria-[haspopup]:scale-[0.97] motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default:
          "h-9 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-lg": "size-10",
        "icon-sm":
          "size-8 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        lg: "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),12px)] px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
      },
      variant: {
        default:
          "border-0 bg-primary bg-linear-to-b from-white/12 to-transparent text-primary-foreground shadow-xs-skeuomorphic before:pointer-events-none before:absolute before:inset-px before:rounded-[inherit] before:border before:border-white/12 before:mask-b-from-0% hover:bg-[color-mix(in_oklch,var(--primary),black_12%)]",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:outline-destructive dark:bg-destructive/20 dark:hover:bg-destructive/30",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        outline:
          "border-0 bg-card text-foreground shadow-xs-skeuomorphic ring-1 ring-border ring-inset hover:bg-muted aria-expanded:bg-muted dark:bg-input/30 dark:ring-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
      },
    },
  }
);

// isLoading = React Aria's isPending (blocks presses, announces progress)
// plus a spinner: it replaces the icon on icon buttons, leads the label otherwise.
function Button({
  children,
  className,
  isLoading = false,
  variant = "default",
  size = "default",
  ...props
}: Omit<ButtonPrimitiveProps, "className" | "isPending"> &
  React.RefAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    className?: string;
    isLoading?: boolean;
  }) {
  const isIcon = size?.startsWith("icon") === true;
  const spinner = (
    <IconLoader2
      className="animate-spin"
      data-icon={isIcon ? undefined : "inline-start"}
    />
  );

  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ className, size, variant }))}
      isPending={isLoading}
      {...props}
    >
      {composeRenderProps(children, (child): React.ReactNode => {
        if (!isLoading) {
          return child;
        }

        return isIcon ? (
          spinner
        ) : (
          <>
            {spinner}
            {child}
          </>
        );
      })}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
