import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type * as React from "react";
import {
  MenuItem as MenuItemPrimitive,
  Menu as MenuPrimitive,
  Popover as PopoverPrimitive,
  composeRenderProps,
} from "react-aria-components";
import type {
  MenuItemProps,
  MenuProps,
  PopoverProps,
} from "react-aria-components";

// A list of actions in a popover. Opened by a MenuTrigger, or controlled
// (isOpen + triggerRef) for context menus.
function MenuPopover({
  children,
  className,
  offset = 4,
  placement = "bottom start",
  ...props
}: Omit<PopoverProps, "children" | "className"> & {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <PopoverPrimitive
      data-slot="menu-popover"
      offset={offset}
      placement={placement}
      className={cn(
        "z-50 min-w-44 origin-(--trigger-anchor-point) overflow-hidden rounded-xl bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-border outline-hidden data-entering:animate-in data-entering:duration-150 data-entering:ease-out data-entering:fade-in-0 data-entering:zoom-in-95 data-exiting:animate-out data-exiting:duration-100 data-exiting:fade-out-0 data-exiting:zoom-out-95 motion-reduce:animate-none",
        className
      )}
      {...props}
    >
      {children}
    </PopoverPrimitive>
  );
}

function Menu<T extends object>({ className, ...props }: MenuProps<T>) {
  return (
    <MenuPrimitive
      data-slot="menu"
      className={cn(
        "max-h-[inherit] overflow-y-auto outline-hidden",
        className
      )}
      {...props}
    />
  );
}

const menuItemVariants = cva(
  "flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-hidden select-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: { variant: "default" },
    variants: {
      variant: {
        default: "data-focused:bg-muted dark:data-focused:bg-input/30",
        destructive:
          "text-destructive data-focused:bg-destructive/10 dark:data-focused:bg-destructive/20",
      },
    },
  }
);

function MenuItem({
  className,
  variant,
  ...props
}: MenuItemProps & VariantProps<typeof menuItemVariants>) {
  return (
    <MenuItemPrimitive
      data-slot="menu-item"
      className={composeRenderProps(className, (renderClassName) =>
        cn(menuItemVariants({ variant }), renderClassName)
      )}
      {...props}
    />
  );
}

export { Menu, MenuItem, MenuPopover };
