import { cn } from "cn";
import type * as React from "react";
import {
  Dialog as AlertDialogPrimitive,
  DialogTrigger as AlertDialogTriggerPrimitive,
  Heading,
  Modal as ModalPrimitive,
  ModalOverlay as ModalOverlayPrimitive,
} from "react-aria-components";
import type {
  DialogTriggerProps,
  ModalOverlayProps,
} from "react-aria-components";

import { Button } from "@/components/ui/button";

function AlertDialogTrigger(props: DialogTriggerProps) {
  return (
    <AlertDialogTriggerPrimitive data-slot="alert-dialog-trigger" {...props} />
  );
}

// Same surface and motion as Dialog, but it asks for a decision: no close
// button and no dismissing by clicking outside (Escape still cancels).
function AlertDialog({
  children,
  className,
  ...props
}: Omit<ModalOverlayProps, "children" | "className" | "isDismissable"> & {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ModalOverlayPrimitive
      data-slot="alert-dialog-overlay"
      className="fixed inset-0 isolate z-50 flex items-center justify-center bg-black/20 p-4 data-entering:animate-in data-entering:duration-200 data-entering:fade-in-0 data-exiting:animate-out data-exiting:duration-150 data-exiting:fade-out-0 supports-backdrop-filter:backdrop-blur-xs dark:bg-black/50"
      {...props}
    >
      <ModalPrimitive
        data-slot="alert-dialog-content"
        className={cn(
          "relative max-h-full w-full max-w-sm overflow-y-auto rounded-2xl bg-popover p-6 text-sm text-popover-foreground shadow-lg ring-1 ring-border outline-hidden data-entering:animate-in data-entering:duration-200 data-entering:ease-[cubic-bezier(0.32,0.72,0,1)] data-entering:fade-in-0 data-entering:zoom-in-95 data-entering:slide-in-from-bottom-2 data-exiting:animate-out data-exiting:duration-[120ms] data-exiting:ease-in data-exiting:fade-out-0 data-exiting:zoom-out-95 motion-reduce:animate-none",
          className
        )}
      >
        <AlertDialogPrimitive
          data-slot="alert-dialog"
          role="alertdialog"
          className="flex flex-col gap-5 outline-hidden"
        >
          {children}
        </AlertDialogPrimitive>
      </ModalPrimitive>
    </ModalOverlayPrimitive>
  );
}

// With an AlertDialogMedia first, the icon sits left of title + description.
function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        "grid gap-1.5 has-data-[slot=alert-dialog-media]:grid-cols-[auto_minmax(0,1fr)] has-data-[slot=alert-dialog-media]:gap-x-4",
        className
      )}
      {...props}
    />
  );
}

function AlertDialogMedia({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="alert-dialog-media"
      className={cn(
        "row-span-2 flex size-10 items-center justify-center rounded-xl bg-muted text-foreground ring-1 ring-border ring-inset dark:bg-input/30 [&_svg:not([class*='size-'])]:size-5",
        className
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Heading>, "slot">) {
  return (
    <Heading
      data-slot="alert-dialog-title"
      slot="title"
      className={cn(
        "font-heading text-lg leading-tight font-semibold tracking-tight",
        className
      )}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="alert-dialog-description"
      className={cn("text-sm text-pretty text-muted-foreground", className)}
      {...props}
    />
  );
}

// Bleeds to the dialog's edges as a tinted strip under a hairline.
function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "-mx-6 -mb-6 flex flex-col-reverse gap-2 rounded-b-2xl border-t bg-muted/50 px-6 py-4 sm:flex-row sm:justify-end dark:bg-input/10",
        className
      )}
      {...props}
    />
  );
}

// Doesn't close the dialog by itself: async actions keep it open (and show
// isLoading) until they settle.
function AlertDialogAction(props: React.ComponentProps<typeof Button>) {
  return <Button data-slot="alert-dialog-action" {...props} />;
}

function AlertDialogCancel({
  variant = "outline",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="alert-dialog-cancel"
      slot="close"
      variant={variant}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
};
