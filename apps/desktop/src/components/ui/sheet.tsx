import { IconX } from "@tabler/icons-react";
import { cn } from "cn";
import type * as React from "react";
import {
  Dialog as SheetPrimitive,
  DialogTrigger as SheetTriggerPrimitive,
  Modal as ModalPrimitive,
  ModalOverlay as ModalOverlayPrimitive,
} from "react-aria-components";
import type {
  DialogTriggerProps,
  ModalOverlayProps,
} from "react-aria-components";

import { Button } from "@/components/ui/button";

function SheetTrigger(props: DialogTriggerProps) {
  return <SheetTriggerPrimitive data-slot="sheet-trigger" {...props} />;
}

// Closes the surrounding sheet when pressed.
function SheetClose({
  variant = "outline",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button data-slot="sheet-close" slot="close" variant={variant} {...props} />
  );
}

// A floating panel inset from the window edge, starting below the title bar
// (h-12) so the macOS traffic lights never sit on it. It slides all the way in from
// its side (fast out, gentle settle) and leaves quicker than it came.
// Name it with aria-label (or put a heading with slot="title" inside).
function Sheet({
  "aria-label": ariaLabel,
  children,
  className,
  showCloseButton = true,
  side = "right",
  variant = "default",
  ...props
}: Omit<ModalOverlayProps, "children" | "className"> & {
  "aria-label"?: string;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
  side?: "left" | "right";
  // sidebar: the window frame's color, for a sidebar moved into a sheet.
  variant?: "default" | "sidebar";
}) {
  return (
    <ModalOverlayPrimitive
      data-slot="sheet-overlay"
      className="fixed inset-0 z-50 bg-black/20 data-entering:animate-in data-entering:duration-300 data-entering:ease-[cubic-bezier(0.32,0.72,0,1)] data-entering:fade-in-0 data-exiting:animate-out data-exiting:duration-200 data-exiting:ease-in data-exiting:fade-out-0 supports-backdrop-filter:backdrop-blur-xs dark:bg-black/50"
      isDismissable
      {...props}
    >
      <ModalPrimitive
        data-slot="sheet-content"
        data-side={side}
        data-variant={variant}
        className={cn(
          "fixed top-12 bottom-2 flex w-72 max-w-[calc(100%-1rem)] flex-col overflow-hidden rounded-xl bg-popover text-sm text-popover-foreground shadow-lg ring-1 ring-border outline-hidden data-entering:animate-in data-entering:duration-300 data-entering:ease-[cubic-bezier(0.32,0.72,0,1)] data-exiting:animate-out data-exiting:duration-200 data-exiting:ease-in data-[side=left]:left-2 data-[side=left]:data-entering:slide-in-from-left-[calc(100%+0.5rem)] data-[side=left]:data-exiting:slide-out-to-left-[calc(100%+0.5rem)] data-[side=right]:right-2 data-[side=right]:data-entering:slide-in-from-right-[calc(100%+0.5rem)] data-[side=right]:data-exiting:slide-out-to-right-[calc(100%+0.5rem)] data-[variant=sidebar]:bg-sidebar data-[variant=sidebar]:text-sidebar-foreground motion-reduce:animate-none",
          className
        )}
      >
        <SheetPrimitive
          aria-label={ariaLabel}
          data-slot="sheet"
          className="relative flex min-h-0 flex-1 flex-col outline-hidden"
        >
          {children}
          {showCloseButton && (
            <SheetClose
              aria-label="Close"
              className="absolute top-3 right-3"
              size="icon-sm"
              variant="ghost"
            >
              <IconX />
            </SheetClose>
          )}
        </SheetPrimitive>
      </ModalPrimitive>
    </ModalOverlayPrimitive>
  );
}

export { Sheet, SheetClose, SheetTrigger };
