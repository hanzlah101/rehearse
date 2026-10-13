import { cn } from "cn";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import { VList } from "virtua";
import type { VListHandle } from "virtua";

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

export type SidebarListRow<T> =
  | { id: string; kind: "header"; title: string }
  | { id: string; item: T; kind: "item"; textValue: string };

const TYPEAHEAD_MS = 500;

// A virtualized listbox (virtua) of section headers and items: only the rows
// in view are rendered, so it stays fast with thousands of items. React
// Aria's ListBox can't be virtualized from outside (its collection needs every
// item rendered), so keyboard support is built in here: one tab stop, arrow
// keys, Home/End, Enter/Space, type-ahead; the focused row is kept mounted
// while scrolled away, and options carry their position in the whole list.
function SidebarList<T>({
  "aria-label": ariaLabel,
  emptyState,
  onAction,
  onItemContextMenu,
  renderItem,
  rows,
  selectedId,
}: {
  "aria-label": string;
  emptyState: React.ReactNode;
  onAction: (item: T) => void;
  onItemContextMenu?: (item: T, target: Element) => void;
  renderItem: (item: T) => React.ReactNode;
  rows: SidebarListRow<T>[];
  selectedId: string | null;
}) {
  const list = useRef<VListHandle>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ at: 0, text: "" });
  const [focused, setFocused] = useState<number | null>(null);
  const items = rows.flatMap((row, index) =>
    row.kind === "item" ? [index] : []
  );
  const selectedRow = rows.findIndex(
    (row) => row.kind === "item" && row.id === selectedId
  );
  const tabRow =
    focused ?? (selectedRow === -1 ? (items[0] ?? -1) : selectedRow);

  // Keep the open item in view when it changes (e.g. after navigating).
  useEffect(() => {
    if (selectedRow !== -1) {
      list.current?.scrollToIndex(selectedRow, { align: "nearest" });
    }
  }, [selectedRow]);

  function focusRow(row: number | undefined) {
    if (row === undefined) {
      return;
    }
    setFocused(row);
    list.current?.scrollToIndex(row, { align: "nearest" });
    requestAnimationFrame(() => {
      scroller.current
        ?.querySelector<HTMLElement>(`[data-row="${String(row)}"]`)
        ?.focus();
    });
  }

  // `now`: the key event's timestamp.
  function findByText(key: string, from: number, now: number) {
    const text =
      (now - typeahead.current.at < TYPEAHEAD_MS
        ? typeahead.current.text
        : "") + key.toLowerCase();
    typeahead.current = { at: now, text };
    // A new search starts after the current item; a longer one includes it.
    const start = items.indexOf(from) + (text.length === 1 ? 1 : 0);
    const ordered = [...items.slice(start), ...items.slice(0, start)];
    return ordered.find((row) => {
      const candidate = rows[row];
      return (
        candidate?.kind === "item" &&
        candidate.textValue.toLowerCase().startsWith(text)
      );
    });
  }

  function onKeyDown(event: React.KeyboardEvent, row: number) {
    const position = items.indexOf(row);
    const current = rows[row];
    let target: number | undefined;

    if (event.key === "ArrowDown") {
      target = items[Math.min(position + 1, items.length - 1)];
    } else if (event.key === "ArrowUp") {
      target = items[Math.max(position - 1, 0)];
    } else if (event.key === "Home") {
      [target] = items;
    } else if (event.key === "End") {
      target = items.at(-1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (current?.kind === "item") {
        onAction(current.item);
      }
      return;
    } else if (
      event.key.length === 1 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      target = findByText(event.key, row, event.timeStamp);
    } else {
      return;
    }

    event.preventDefault();
    focusRow(target);
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 px-5 py-6 text-center text-sm text-muted-foreground">
        {emptyState}
      </div>
    );
  }

  return (
    <div
      data-slot="sidebar-list"
      className="relative min-h-0 flex-1"
      ref={scroller}
    >
      <VList
        aria-label={ariaLabel}
        className="absolute inset-0 pb-3 outline-hidden"
        keepMounted={focused === null ? undefined : [focused]}
        ref={list}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- <select> can't hold virtualized custom rows
        role="listbox"
      >
        {rows.map((row, index) =>
          row.kind === "header" ? (
            <div
              className={cn(
                "px-5.5 pb-1.5 text-xs font-medium text-muted-foreground",
                index === 0 ? "pt-2" : "pt-4"
              )}
              key={row.id}
              role="presentation"
            >
              {row.title}
            </div>
          ) : (
            <div className="px-3 py-px" key={row.id} role="presentation">
              <div
                aria-posinset={items.indexOf(index) + 1}
                aria-selected={row.id === selectedId}
                aria-setsize={items.length}
                className="group/item flex cursor-default flex-col gap-0.5 rounded-lg px-2.5 py-1.5 text-sm text-sidebar-foreground/85 outline-hidden transition-colors duration-150 ease-out select-none hover:text-sidebar-foreground not-data-selected:hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid not-data-selected:active:bg-sidebar-accent motion-reduce:transition-none dark:not-data-selected:hover:bg-input/15 data-selected:bg-card data-selected:text-sidebar-foreground data-selected:shadow-xs data-selected:ring-1 data-selected:ring-border/60 data-selected:ring-inset dark:data-selected:bg-input/25 dark:data-selected:shadow-none"
                data-row={index}
                // The data-selected variant matches "true", as React Aria sets it.
                data-selected={row.id === selectedId ? "true" : undefined}
                data-slot="sidebar-list-item"
                onClick={() => {
                  setFocused(index);
                  onAction(row.item);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  onItemContextMenu?.(row.item, event.currentTarget);
                }}
                onFocus={() => {
                  setFocused(index);
                }}
                onKeyDown={(event) => {
                  onKeyDown(event, index);
                }}
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- rows of the custom listbox above
                role="option"
                tabIndex={index === tabRow ? 0 : -1}
              >
                {renderItem(row.item)}
              </div>
            </div>
          )
        )}
      </VList>
    </div>
  );
}

export { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarList };
