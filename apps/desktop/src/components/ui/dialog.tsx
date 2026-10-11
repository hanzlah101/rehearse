import { IconX } from "@tabler/icons-react";
import { cn } from "cn";
import type * as React from "react";
import {
  Dialog as DialogPrimitive,
  DialogTrigger as DialogTriggerPrimitive,
  Heading,
  ModalOverlay as ModalOverlayPrimitive,
  Modal as ModalPrimitive,
} from "react-aria-components";
import type {
  DialogTriggerProps,
  ModalOverlayProps,
} from "react-aria-components";

import { Button } from "@/components/ui/button";

function DialogTrigger(props: DialogTriggerProps) {
  return <DialogTriggerPrimitive data-slot="dialog-trigger" {...props} />;
}

// Closes the surrounding dialog when pressed.
function DialogClose({
  variant = "outline",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="dialog-close"
      slot="close"
      variant={variant}
      {...props}
    />
  );
}

// The overlay centers the modal, so it needs no translate tricks.
function Dialog({
  children,
  className,
  isDismissable = true,
  showCloseButton = true,
  ...props
}: Omit<ModalOverlayProps, "children" | "className"> & {
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}) {
  return (
    <ModalOverlayPrimitive
      data-slot="dialog-overlay"
      className="fixed inset-0 isolate z-50 flex items-center justify-center bg-black/20 p-4 data-entering:animate-in data-entering:duration-200 data-entering:fade-in-0 data-exiting:animate-out data-exiting:duration-150 data-exiting:fade-out-0 supports-backdrop-filter:backdrop-blur-xs dark:bg-black/50"
      isDismissable={isDismissable}
      {...props}
    >
      <ModalPrimitive
        data-slot="dialog-content"
        className={cn(
          "relative max-h-full w-full max-w-md overflow-y-auto rounded-2xl bg-popover p-6 text-sm text-popover-foreground shadow-lg ring-1 ring-border outline-hidden data-entering:animate-in data-entering:duration-200 data-entering:ease-[cubic-bezier(0.32,0.72,0,1)] data-entering:fade-in-0 data-entering:zoom-in-95 data-entering:slide-in-from-bottom-2 data-exiting:animate-out data-exiting:duration-[120ms] data-exiting:ease-in data-exiting:fade-out-0 data-exiting:zoom-out-95 motion-reduce:animate-none",
          className
        )}
      >
        <DialogPrimitive
          data-slot="dialog"
          className="flex flex-col gap-5 outline-hidden"
        >
          {children}
          {showCloseButton && (
            <DialogClose
              aria-label="Close"
              className="absolute top-3 right-3"
              size="icon-sm"
              variant="ghost"
            >
              <IconX />
            </DialogClose>
          )}
        </DialogPrimitive>
      </ModalPrimitive>
    </ModalOverlayPrimitive>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 pr-8", className)}
      {...props}
    />
  );
}

// Bleeds to the dialog's edges as a tinted strip under a hairline.
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-6 -mb-6 flex flex-col-reverse gap-2 rounded-b-2xl border-t bg-muted/50 px-6 py-4 sm:flex-row sm:justify-end dark:bg-input/10",
        className
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Heading>, "slot">) {
  return (
    <Heading
      data-slot="dialog-title"
      slot="title"
      className={cn(
        "font-heading text-lg leading-tight font-semibold tracking-tight",
        className
      )}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="dialog-description"
      className={cn("text-sm text-pretty text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
