import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import {
  MenuItem as MenuItemPrimitive,
  Menu as MenuPrimitive,
  MenuTrigger as MenuTriggerPrimitive,
  Popover as PopoverPrimitive,
  Separator as SeparatorPrimitive,
  composeRenderProps,
} from "react-aria-components";
import type {
  MenuItemProps,
  MenuProps,
  MenuTriggerProps,
  SeparatorProps,
} from "react-aria-components";

// Trimmed from shadcn's aria-nova context menu. Opens on right-click, the
// context-menu key or a long press on its child (a React Aria pressable, e.g.
// wrapped in <Pressable>), at the pointer.
function ContextMenuTrigger(props: Omit<MenuTriggerProps, "trigger">) {
  return (
    <MenuTriggerPrimitive
      data-slot="context-menu"
      trigger="contextMenu"
      {...props}
    />
  );
}

function ContextMenu<T extends object>({
  className,
  ...props
}: Omit<MenuProps<T>, "className"> & { className?: string }) {
  return (
    <PopoverPrimitive
      data-slot="context-menu-content"
      className={cn(
        "z-50 min-w-44 origin-(--trigger-anchor-point) overflow-hidden rounded-xl bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-border outline-hidden data-entering:animate-in data-entering:duration-150 data-entering:ease-out data-entering:fade-in-0 data-entering:zoom-in-95 data-exiting:animate-out data-exiting:duration-100 data-exiting:fade-out-0 data-exiting:zoom-out-95 motion-reduce:animate-none",
        className
      )}
    >
      <MenuPrimitive
        className="max-h-[inherit] overflow-y-auto outline-hidden"
        {...props}
      />
    </PopoverPrimitive>
  );
}

const contextMenuItemVariants = cva(
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

function ContextMenuItem({
  className,
  variant,
  ...props
}: MenuItemProps & VariantProps<typeof contextMenuItemVariants>) {
  return (
    <MenuItemPrimitive
      data-slot="context-menu-item"
      className={composeRenderProps(className, (renderClassName) =>
        cn(contextMenuItemVariants({ variant }), renderClassName)
      )}
      {...props}
    />
  );
}

function ContextMenuSeparator({ className, ...props }: SeparatorProps) {
  return (
    <SeparatorPrimitive
      data-slot="context-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
};
