import { IconPlus } from "@tabler/icons-react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Facehash } from "facehash";
import { useContext } from "react";
import { OverlayTriggerStateContext } from "react-aria-components";

import logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarList,
  SidebarListItem,
  SidebarListSection,
} from "@/components/ui/sidebar";
import { formatPercent } from "@/lib/format";
import { LogoutDialog } from "@/modules/auth/components/logout-dialog";
import { useSession } from "@/modules/auth/queries/session";
import { REHEARSAL_GROUPS } from "@/modules/history/lib/rehearsals";

// Avatar backgrounds: the palette's cobalt plus the chart hues, so every
// student gets a face that still belongs to the app.
const AVATAR_COLORS = ["#3D6BE0", "#2BA3B5", "#D9A43A", "#E06B4A", "#9A5BC9"];

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
  return (
    <Sidebar className={className}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 pb-2">
          <img src={logo} alt="" className="size-7" />
          <span className="font-heading text-base font-semibold tracking-tight">
            Rehearse
          </span>
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
      </SidebarHeader>

      <SidebarContent>
        <SidebarList
          aria-label="Previous rehearsals"
          disallowEmptySelection
          onSelectionChange={(keys) => {
            const [key] = keys === "all" ? [] : keys;

            if (key !== undefined) {
              void navigate({
                params: { id: String(key) },
                to: "/rehearsals/$id",
              });
              sheet?.close();
            }
          }}
          renderEmptyState={() => "No rehearsals yet."}
          selectedKeys={rehearsalId === undefined ? [] : [rehearsalId]}
          selectionMode="single"
        >
          {REHEARSAL_GROUPS.map((group) => (
            <SidebarListSection
              id={group.label}
              key={group.label}
              title={group.label}
            >
              {group.rehearsals.map((item) => (
                <SidebarListItem
                  id={item.id}
                  key={item.id}
                  textValue={item.topic}
                >
                  <span className="min-w-0 flex-1 truncate">{item.topic}</span>
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">
                    {formatPercent(item.latest.score)}
                  </span>
                </SidebarListItem>
              ))}
            </SidebarListSection>
          ))}
        </SidebarList>
      </SidebarContent>

      <SidebarFooter>
        <Facehash
          aria-hidden="true"
          className="shrink-0 rounded-full"
          colors={AVATAR_COLORS}
          intensity3d="subtle"
          name={student.name}
          size={32}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{student.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {student.studentId}
          </span>
        </div>
        <LogoutDialog />
      </SidebarFooter>
    </Sidebar>
  );
}
