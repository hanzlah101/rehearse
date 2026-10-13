import { IconCheck, IconSelector } from "@tabler/icons-react";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type * as React from "react";
import {
  Button as ButtonPrimitive,
  composeRenderProps,
  ListBoxItem as ListBoxItemPrimitive,
  ListBox as ListBoxPrimitive,
  Popover as PopoverPrimitive,
  Select as SelectPrimitive,
  SelectValue as SelectValuePrimitive,
} from "react-aria-components";
import type {
  ListBoxItemProps,
  PopoverProps,
  SelectProps,
} from "react-aria-components";

// Adapted from shadcn's aria-nova select: trigger styled like Input, list in a
// popover. Label it with a <Label> inside or aria-label.
function Select<T extends object>({ className, ...props }: SelectProps<T>) {
  return (
    <SelectPrimitive
      data-slot="select"
      className={composeRenderProps(className, (renderClassName) =>
        cn("group/select flex flex-col gap-2", renderClassName)
      )}
      {...props}
    />
  );
}

const selectTriggerVariants = cva(
  "flex w-full min-w-0 cursor-default items-center gap-2 bg-card px-3 text-left text-sm text-foreground shadow-xs ring-1 ring-input outline-hidden transition-shadow duration-100 ease-linear ring-inset data-focus-visible:ring-2 data-focus-visible:ring-ring data-pressed:bg-muted dark:bg-input/30 data-disabled:cursor-not-allowed data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: { size: "default" },
    variants: {
      size: {
        default: "h-10 rounded-lg",
        // Compact, for toolbars.
        sm: "h-9 rounded-md font-medium",
      },
    },
  }
);

function SelectTrigger({
  children,
  className,
  size,
}: {
  children?: React.ReactNode;
  className?: string;
} & VariantProps<typeof selectTriggerVariants>) {
  return (
    <ButtonPrimitive
      data-slot="select-trigger"
      className={cn(selectTriggerVariants({ size }), className)}
    >
      {children}
      {/* The selected item's textValue, so items with rich content (two
          lines, badges) still read as one line here. */}
      <SelectValuePrimitive
        data-slot="select-value"
        className="min-w-0 flex-1 truncate data-placeholder:text-muted-foreground"
      >
        {({ defaultChildren, isPlaceholder, selectedText }) => (
          <span>
            {isPlaceholder || selectedText === ""
              ? defaultChildren
              : selectedText}
          </span>
        )}
      </SelectValuePrimitive>
      <IconSelector className="text-muted-foreground" />
    </ButtonPrimitive>
  );
}

function SelectContent<T extends object>({
  children,
  className,
  items,
  ...props
}: Omit<PopoverProps, "children" | "className"> & {
  children: React.ReactNode | ((item: T) => React.ReactNode);
  className?: string;
  items?: Iterable<T>;
}) {
  return (
    <PopoverPrimitive
      data-slot="select-content"
      offset={6}
      className={cn(
        "z-50 w-(--trigger-width) min-w-48 origin-(--trigger-anchor-point) overflow-hidden rounded-xl bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-border outline-hidden data-entering:animate-in data-entering:duration-150 data-entering:fade-in-0 data-entering:zoom-in-95 data-exiting:animate-out data-exiting:duration-100 data-exiting:fade-out-0 data-exiting:zoom-out-95 motion-reduce:animate-none",
        className
      )}
      {...props}
    >
      <ListBoxPrimitive
        className="max-h-[inherit] overflow-y-auto outline-hidden"
        items={items}
      >
        {children}
      </ListBoxPrimitive>
    </PopoverPrimitive>
  );
}

function SelectItem({ children, className, ...props }: ListBoxItemProps) {
  return (
    <ListBoxItemPrimitive
      data-slot="select-item"
      textValue={typeof children === "string" ? children : undefined}
      className={composeRenderProps(className, (renderClassName) =>
        cn(
          "relative flex cursor-default items-center gap-2 rounded-lg py-2 pr-8 pl-2.5 text-sm outline-hidden select-none data-focused:bg-muted dark:data-focused:bg-input/30 data-selected:font-medium data-disabled:opacity-50",
          renderClassName
        )
      )}
      {...props}
    >
      {composeRenderProps(children, (child, { isSelected }) => (
        <>
          <span className="min-w-0 flex-1 truncate">{child}</span>
          {isSelected && (
            <IconCheck className="absolute right-2.5 size-4 text-primary" />
          )}
        </>
      ))}
    </ListBoxItemPrimitive>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger };
