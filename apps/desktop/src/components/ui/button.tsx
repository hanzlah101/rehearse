import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type * as React from "react";
import {
  Button as ButtonPrimitive,
  composeRenderProps,
} from "react-aria-components";
import type { ButtonProps as ButtonPrimitiveProps } from "react-aria-components";

import { Spinner } from "@/components/ui/spinner";

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
        // Round record button for the page's one main action, with a halo.
        "icon-xl":
          "size-18 rounded-full ring-8 ring-primary/12 [&_svg:not([class*='size-'])]:size-7",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        lg: "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),12px)] px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
      },
      variant: {
        default:
          "border-0 bg-primary bg-linear-to-b from-white/12 to-transparent text-primary-foreground shadow-xs-skeuomorphic before:pointer-events-none before:absolute before:inset-px before:rounded-[inherit] before:border before:border-white/12 before:mask-b-from-0% hover:bg-[color-mix(in_oklch,var(--primary),black_12%)]",
        // Solid, like default: the confirming action of a destructive choice.
        destructive:
          "border-0 bg-destructive bg-linear-to-b from-white/12 to-transparent text-white shadow-xs-skeuomorphic before:pointer-events-none before:absolute before:inset-px before:rounded-[inherit] before:border before:border-white/12 before:mask-b-from-0% hover:bg-[color-mix(in_oklch,var(--destructive),black_12%)] focus-visible:outline-destructive",
        "destructive-ghost":
          "text-destructive hover:bg-destructive/10 focus-visible:outline-destructive aria-expanded:bg-destructive/10 dark:hover:bg-destructive/20 dark:aria-expanded:bg-destructive/20",
        // Soft red tint: a destructive option next to calmer ones (Cancel).
        "destructive-muted":
          "bg-destructive/10 text-destructive hover:bg-destructive/18 focus-visible:outline-destructive dark:bg-destructive/18 dark:hover:bg-destructive/28",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-input/40 dark:aria-expanded:bg-input/40",
        link: "text-primary underline-offset-4 hover:underline",
        // Soft neutral fill: a secondary action that should stay quiet.
        muted:
          "bg-muted text-foreground hover:bg-[color-mix(in_oklch,var(--muted),var(--foreground)_7%)] aria-expanded:bg-[color-mix(in_oklch,var(--muted),var(--foreground)_7%)] dark:bg-input/25 dark:hover:bg-input/40 dark:aria-expanded:bg-input/40",
        outline:
          "border-0 bg-card text-foreground shadow-xs-skeuomorphic ring-1 ring-border ring-inset hover:bg-muted aria-expanded:bg-muted dark:bg-input/30 dark:ring-input dark:hover:bg-input/50",
        // Cobalt glass: a tint that deepens toward the bottom, a firm primary
        // ring, a white hairline catching the top, flat neutral shadow.
        "primary-outline":
          "border-0 bg-card bg-linear-to-b from-primary/8 to-primary/20 text-primary shadow-xs ring-1 ring-primary/60 ring-inset before:pointer-events-none before:absolute before:inset-px before:rounded-[inherit] before:border before:border-white/90 before:mask-b-from-0% hover:from-primary/14 hover:to-primary/28 hover:ring-primary/80 dark:bg-transparent dark:from-primary/55 dark:to-primary/20 dark:text-primary-foreground dark:ring-primary/80 dark:before:border-white/30 dark:hover:from-primary/75 dark:hover:to-primary/35 dark:hover:ring-primary",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
      },
    },
  }
);

function Button({
  children,
  className,
  isDisabled = false,
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

  const spinner = <Spinner data-icon={isIcon ? undefined : "inline-start"} />;

  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ className, size, variant }))}
      isDisabled={isDisabled || isLoading}
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
