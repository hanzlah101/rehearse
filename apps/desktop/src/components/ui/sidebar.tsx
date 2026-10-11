import { cn } from "cn";
import type * as React from "react";
import {
  composeRenderProps,
  Header,
  ListBox,
  ListBoxItem,
  ListBoxSection,
} from "react-aria-components";
import type {
  ListBoxItemProps,
  ListBoxProps,
  ListBoxSectionProps,
} from "react-aria-components";

// Sits on the window frame (AppLayout paints it), so it has no surface of its
// own.
function Sidebar({ className, ...props }: React.ComponentProps<"aside">) {
  return (
    <aside
      data-slot="sidebar"
      className={cn(
        "flex w-64 shrink-0 flex-col text-sidebar-foreground",
        className
      )}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex flex-col gap-2 p-3", className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-3", className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("flex items-center gap-2.5 p-3", className)}
      {...props}
    />
  );
}

// Keyboard-navigable list (arrow keys, type-ahead) of sections and items.
function SidebarList<T extends object>({
  className,
  ...props
}: ListBoxProps<T>) {
  return (
    <ListBox
      data-slot="sidebar-list"
      // Escape should close a sheet holding the sidebar, not clear selection.
      escapeKeyBehavior="none"
      className={composeRenderProps(className, (renderClassName) =>
        cn(
          "flex flex-col gap-4 outline-hidden data-empty:px-2 data-empty:py-6 data-empty:text-center data-empty:text-sm data-empty:text-muted-foreground",
          renderClassName
        )
      )}
      {...props}
    />
  );
}

function SidebarListSection<T extends object>({
  children,
  className,
  title,
  ...props
}: Omit<ListBoxSectionProps<T>, "children"> & {
  children: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <ListBoxSection
      data-slot="sidebar-list-section"
      className={cn("flex flex-col gap-0.5", className)}
      {...props}
    >
      <Header className="px-2 pb-1 text-xs font-medium text-muted-foreground">
        {title}
      </Header>
      {children}
    </ListBoxSection>
  );
}

// Selected = raised onto the panel material (bg-card).
function SidebarListItem({ className, ...props }: ListBoxItemProps) {
  return (
    <ListBoxItem
      data-slot="sidebar-list-item"
      className={composeRenderProps(className, (renderClassName) =>
        cn(
          "flex h-8 cursor-default items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground/80 outline-hidden transition-[background-color,box-shadow] duration-150 ease-out select-none data-focus-visible:outline-2 data-focus-visible:-outline-offset-2 data-focus-visible:outline-ring data-focus-visible:outline-solid data-hovered:text-sidebar-foreground not-data-selected:data-hovered:bg-sidebar-accent not-data-selected:data-pressed:bg-sidebar-accent motion-reduce:transition-none dark:not-data-selected:data-hovered:bg-input/15 data-selected:bg-card data-selected:font-medium data-selected:text-sidebar-foreground data-selected:shadow-xs-skeuomorphic dark:data-selected:bg-card dark:data-selected:shadow-none dark:data-selected:ring-1 dark:data-selected:ring-border dark:data-selected:ring-inset",
          renderClassName
        )
      )}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarList,
  SidebarListItem,
  SidebarListSection,
};
