import {
  IconLogout,
  IconSelector,
  IconSettingsFilled,
} from "@tabler/icons-react";
import { useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useContext, useState } from "react";
import {
  Button,
  MenuTrigger,
  OverlayTriggerStateContext,
} from "react-aria-components";

import { Menu, MenuItem, MenuPopover } from "@/components/ui/menu";
import { LogoutDialog } from "@/modules/auth/components/logout-dialog";
import { StudentAvatar } from "@/modules/auth/components/student-avatar";
import { useSession } from "@/modules/auth/queries/session";

// The sidebar's footer: the student (avatar, name, ID) as one button that
// opens Settings and Log out. Raised like a selected row while Settings is
// open. Inside the narrow-window sheet, going to Settings also closes it.
export function AccountMenu() {
  const { student } = useSession();
  const navigate = useNavigate();
  const sheet = useContext(OverlayTriggerStateContext);
  const isOnSettings = Boolean(useMatchRoute()({ to: "/settings" }));
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  return (
    <>
      <MenuTrigger>
        <Button
          className="group/account flex w-full cursor-default items-center gap-2.5 rounded-lg p-2 text-left outline-hidden transition-colors duration-150 ease-out select-none hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid aria-expanded:bg-sidebar-accent data-current:bg-card data-current:shadow-xs data-current:ring-1 data-current:ring-border/60 data-current:ring-inset motion-reduce:transition-none dark:hover:bg-input/15 dark:aria-expanded:bg-input/15 dark:data-current:bg-input/25 dark:data-current:shadow-none"
          data-current={isOnSettings ? "true" : undefined}
        >
          <StudentAvatar name={student.name} size={32} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{student.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {student.studentId}
            </span>
          </span>
          <IconSelector
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground group-hover/account:text-sidebar-foreground"
          />
        </Button>
        <MenuPopover className="w-(--trigger-width)" placement="top start">
          <Menu
            aria-label="Account"
            onAction={(key) => {
              if (key === "settings") {
                void navigate({ to: "/settings" });
                sheet?.close();
              } else {
                setIsLoggingOut(true);
              }
            }}
          >
            <MenuItem id="settings">
              <IconSettingsFilled />
              Settings
            </MenuItem>
            <MenuItem id="logout" variant="destructive">
              <IconLogout />
              Log out
            </MenuItem>
          </Menu>
        </MenuPopover>
      </MenuTrigger>
      <LogoutDialog isOpen={isLoggingOut} onOpenChange={setIsLoggingOut} />
    </>
  );
}
