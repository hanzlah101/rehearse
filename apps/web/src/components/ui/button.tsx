import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type * as React from "react";
import { Button as ButtonPrimitive, Link } from "react-aria-components";
import type {
  ButtonProps as ButtonPrimitiveProps,
  LinkProps,
} from "react-aria-components";

// The desktop app's Button (apps/desktop/src/components/ui/button.tsx): same
// base and variant classes, trimmed to what the site uses, plus a link form.
const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap outline-hidden transition-[background-color,box-shadow,color,scale] duration-300 ease-out select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:pointer-events-none disabled:opacity-50 data-pressed:scale-[0.97] motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default:
          "h-9 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        // Download: the platform icon, then its name over a detail line.
        download:
          "h-15 gap-3 rounded-xl pr-6 pl-4.5 text-base [&_svg:not([class*='size-'])]:size-6",
        "icon-sm": "size-8 rounded-[min(var(--radius-md),12px)]",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),12px)] px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
      },
      variant: {
        default:
          "border-0 bg-primary bg-linear-to-b from-white/12 to-transparent text-primary-foreground shadow-xs-skeuomorphic before:pointer-events-none before:absolute before:inset-px before:rounded-[inherit] before:border before:border-white/12 before:mask-b-from-0% hover:bg-[color-mix(in_oklch,var(--primary),black_12%)]",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-input/40",
      },
    },
  }
);

type ButtonVariantProps = VariantProps<typeof buttonVariants> & {
  className?: string;
};

function Button({
  className,
  size = "default",
  variant = "default",
  ...props
}: Omit<ButtonPrimitiveProps, "className"> &
  React.RefAttributes<HTMLButtonElement> &
  ButtonVariantProps) {
  return (
    <ButtonPrimitive
      className={cn(buttonVariants({ className, size, variant }))}
      data-size={size}
      data-slot="button"
      data-variant={variant}
      {...props}
    />
  );
}

// A Button that navigates. External URLs only: internal pages use the router's
// Link.
function ButtonLink({
  className,
  size = "default",
  variant = "default",
  ...props
}: Omit<LinkProps, "className"> &
  React.RefAttributes<HTMLAnchorElement> &
  ButtonVariantProps) {
  return (
    <Link
      className={cn(buttonVariants({ className, size, variant }))}
      data-size={size}
      data-slot="button"
      data-variant={variant}
      {...props}
    />
  );
}

export { Button, ButtonLink, buttonVariants };
