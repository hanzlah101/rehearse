import { cn } from "cn";
import type * as React from "react";
import {
  Dialog,
  DialogTrigger,
  Heading,
  Popover as PopoverPrimitive,
} from "react-aria-components";
import type { DialogTriggerProps, PopoverProps } from "react-aria-components";

function PopoverTrigger(props: DialogTriggerProps) {
  return <DialogTrigger data-slot="popover-trigger" {...props} />;
}

// A small non-modal panel anchored to its trigger, closed by Escape or a click
// outside. Name it with a PopoverTitle inside (or aria-label).
function Popover({
  "aria-label": ariaLabel,
  children,
  className,
  offset = 8,
  placement = "bottom",
  ...props
}: Omit<PopoverProps, "children" | "className"> & {
  "aria-label"?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <PopoverPrimitive
      data-slot="popover"
      offset={offset}
      placement={placement}
      className={cn(
        "z-50 w-72 origin-(--trigger-anchor-point) rounded-xl bg-popover p-4 text-sm text-popover-foreground shadow-lg ring-1 ring-border outline-hidden data-entering:animate-in data-entering:duration-150 data-entering:ease-out data-entering:fade-in-0 data-entering:zoom-in-95 data-exiting:animate-out data-exiting:duration-100 data-exiting:fade-out-0 data-exiting:zoom-out-95 data-[placement=bottom]:slide-in-from-top-1 data-[placement=top]:slide-in-from-bottom-1 motion-reduce:animate-none",
        className
      )}
      {...props}
    >
      <Dialog
        aria-label={ariaLabel}
        className="flex flex-col gap-2 outline-hidden"
      >
        {children}
      </Dialog>
    </PopoverPrimitive>
  );
}

function PopoverTitle({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Heading>, "slot">) {
  return (
    <Heading
      data-slot="popover-title"
      slot="title"
      className={cn("text-sm leading-snug font-semibold", className)}
      {...props}
    />
  );
}

function PopoverDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="popover-description"
      className={cn("text-sm text-pretty text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Popover, PopoverDescription, PopoverTitle, PopoverTrigger };
