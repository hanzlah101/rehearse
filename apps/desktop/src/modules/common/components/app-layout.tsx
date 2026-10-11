import { IconLayoutSidebarFilled } from "@tabler/icons-react";
import { Outlet } from "@tanstack/react-router";

import logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { HistorySidebar } from "@/modules/history/components/history-sidebar";

// Shell of every logged-in page: the sidebar colour is the window frame and
// the page sits on a raised panel inside it. There is no title bar, so the
// frame itself (and the strips above the sidebar / narrow top bar) drag the
// window and keep clear of the macOS traffic lights. Below lg the sidebar
// moves into a sheet opened from the top bar.
export function AppLayout() {
  return (
    <div
      data-tauri-drag-region
      className="flex min-h-0 flex-1 flex-col bg-sidebar lg:flex-row"
    >
      <div
        data-tauri-drag-region
        className="flex h-12 shrink-0 items-center gap-3 pr-4 pl-20 lg:hidden"
      >
        <SheetTrigger>
          <Button aria-label="Show history" size="icon-sm" variant="ghost">
            <IconLayoutSidebarFilled />
          </Button>
          <Sheet aria-label="History" side="left" variant="sidebar">
            <HistorySidebar className="w-full flex-1" />
          </Sheet>
        </SheetTrigger>
        <div className="pointer-events-none flex items-center gap-2">
          <img src={logo} alt="" className="size-5" />
          <span className="font-heading text-sm font-semibold">Rehearse</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-col max-lg:hidden">
        <div data-tauri-drag-region className="h-10 shrink-0" />
        <HistorySidebar className="min-h-0 flex-1" />
      </div>

      {/* relative: absolutely positioned content (sr-only labels, popovers'
          anchors) is laid out and clipped here, not against the window. */}
      <div className="relative mx-2 mb-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-card shadow-xs ring-1 ring-border lg:mt-2 lg:ml-0">
        <Outlet />
      </div>
    </div>
  );
}
