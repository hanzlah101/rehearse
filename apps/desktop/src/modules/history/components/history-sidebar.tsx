import {
  IconAlertCircleFilled,
  IconMicrophoneFilled,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { cn } from "cn";
import { useContext, useState } from "react";
import { OverlayTriggerStateContext, useFilter } from "react-aria-components";

import logo from "@/assets/logo.svg";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { SearchField } from "@/components/ui/search-field";
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarList,
} from "@/components/ui/sidebar";
import type { SidebarListRow } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { daysAgo, formatNumber, formatPercent, formatWhen } from "@/lib/format";
import { AccountMenu } from "@/modules/auth/components/account-menu";
import { useSession } from "@/modules/auth/queries/session";
import { UpdateCard } from "@/modules/common/components/update-card";
import { useDeleteRehearsal } from "@/modules/history/actions/delete-rehearsal";
import { UsageMeter } from "@/modules/history/components/usage-meter";
import type { RehearsalSummary } from "@/modules/history/lib/rehearsals";
import { rehearsalsQueryOptions } from "@/modules/history/queries/rehearsals";

function groupFor(updatedAt: Date) {
  const days = daysAgo(updatedAt);

  if (days === 0) {
    return "Today";
  }
  if (days === 1) {
    return "Yesterday";
  }

  return days <= 7 ? "Previous 7 days" : "Earlier";
}

// Flat rows for the virtualized list: a header before each day group.
// Rehearsals arrive newest first, so groups come out in order too.
function toRows(rehearsals: RehearsalSummary[]) {
  const rows: SidebarListRow<RehearsalSummary>[] = [];
  let group = "";

  for (const rehearsal of rehearsals) {
    const label = groupFor(rehearsal.updatedAt);
    if (label !== group) {
      group = label;
      rows.push({ id: `group:${label}`, kind: "header", title: label });
    }
    rows.push({
      id: rehearsal.id,
      item: rehearsal,
      kind: "item",
      textValue: rehearsal.topic,
    });
  }

  return rows;
}

function RehearsalStatus({ item }: { item: RehearsalSummary }) {
  if (item.latestStatus === "processing") {
    return (
      <span className="shrink-0 text-muted-foreground">
        <Spinner className="size-3.5" />
      </span>
    );
  }
  if (item.latestStatus === "failed") {
    return (
      <IconAlertCircleFilled
        aria-hidden="true"
        className="size-4 shrink-0 text-destructive"
      />
    );
  }
  return item.latestScore === null ? null : (
    <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums group-data-selected/item:text-sidebar-foreground">
      {formatPercent(item.latestScore)}
    </span>
  );
}

function detailsOf(item: RehearsalSummary) {
  if (item.latestStatus === "processing") {
    return "Analysing…";
  }
  if (item.latestStatus === "failed") {
    return "Analysis stopped";
  }
  const attempts = `${formatNumber(item.attemptCount)} ${item.attemptCount === 1 ? "attempt" : "attempts"}`;
  return `${attempts} · ${formatWhen(item.updatedAt)}`;
}

// Two lines: the topic with its latest score (or analysis state), then the
// attempts and when it was last practised.
function RehearsalRow({ item }: { item: RehearsalSummary }) {
  return (
    <>
      <span className="flex min-w-0 items-center gap-3">
        <span className="min-w-0 flex-1 truncate leading-5 font-medium">
          {item.topic}
        </span>
        <RehearsalStatus item={item} />
      </span>
      <span
        className={cn(
          "truncate text-xs leading-4",
          item.latestStatus === "failed"
            ? "text-destructive"
            : "text-muted-foreground"
        )}
      >
        {detailsOf(item)}
      </span>
    </>
  );
}

// Each rehearsal opens its own page; the open one stays selected. Inside the
// narrow-window sheet, navigating also closes the sheet.
export function HistorySidebar({ className }: { className?: string }) {
  const { student } = useSession();
  const navigate = useNavigate();
  const sheet = useContext(OverlayTriggerStateContext);
  const rehearsalId = useParams({
    select: (params) => params.id,
    strict: false,
  });
  const { data: rehearsals } = useSuspenseQuery(
    rehearsalsQueryOptions(student.id)
  );
  const deletion = useDeleteRehearsal();
  // Title search over the loaded list, ignoring case and accents.
  const [query, setQuery] = useState("");
  const { contains } = useFilter({ sensitivity: "base" });
  const search = query.trim();
  const matches =
    search === ""
      ? rehearsals
      : rehearsals.filter((rehearsal) => contains(rehearsal.topic, search));
  const [toDelete, setToDelete] = useState<RehearsalSummary | null>(null);

  return (
    <Sidebar className={className}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 pb-2">
          <img src={logo} alt="" className="size-7" />
          <span className="font-heading text-base font-semibold tracking-tight">
            Rehearse
          </span>
          <Badge>Beta</Badge>
        </div>
        <Button
          className="w-full"
          onPress={() => {
            void navigate({ to: "/" });
            sheet?.close();
          }}
          variant="primary-outline"
        >
          <IconPlus data-icon="inline-start" />
          New rehearsal
        </Button>
        {rehearsals.length > 0 && (
          <SearchField
            aria-label="Search rehearsals"
            onChange={setQuery}
            placeholder="Search"
            value={query}
          />
        )}
      </SidebarHeader>

      <SidebarList
        aria-label="Previous rehearsals"
        // Right-click (or the context-menu key) on a row opens its menu at
        // the pointer.
        renderContextMenu={(item) => (
          <ContextMenu aria-label={`${item.topic} options`}>
            <ContextMenuItem
              onAction={() => {
                void navigate({
                  search: {
                    minutes: item.targetSeconds / 60,
                    rehearsal: item.id,
                    topic: item.topic,
                    topicId: item.topicId ?? undefined,
                  },
                  to: "/session",
                });
                sheet?.close();
              }}
            >
              <IconMicrophoneFilled />
              Try again
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onAction={() => {
                setToDelete(item);
              }}
              variant="destructive"
            >
              <IconTrash />
              Delete rehearsal
            </ContextMenuItem>
          </ContextMenu>
        )}
        emptyState={
          search === ""
            ? "No rehearsals yet."
            : `No rehearsals match “${search}”.`
        }
        onAction={(item) => {
          void navigate({ params: { id: item.id }, to: "/rehearsals/$id" });
          sheet?.close();
        }}
        renderItem={(item) => <RehearsalRow item={item} />}
        rows={toRows(matches)}
        selectedId={rehearsalId ?? null}
      />

      <AlertDialog
        isKeyboardDismissDisabled={deletion.isPending}
        isOpen={toDelete !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setToDelete(null);
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this rehearsal?</AlertDialogTitle>
          <AlertDialogDescription>
            “{toDelete?.topic}” and every attempt in it, recordings and feedback
            included, will be deleted. This can’t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel isDisabled={deletion.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            isLoading={deletion.isPending}
            onPress={() => {
              if (toDelete !== null) {
                deletion.mutate(toDelete.id, {
                  onSettled: () => {
                    setToDelete(null);
                  },
                });
              }
            }}
            variant="destructive"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>

      <UpdateCard />
      <UsageMeter />

      <SidebarFooter>
        <AccountMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
