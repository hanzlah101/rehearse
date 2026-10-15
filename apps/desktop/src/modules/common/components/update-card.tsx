import { IconCircleArrowDownFilled } from "@tabler/icons-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { restartIntoUpdate, useReadyUpdate } from "@/modules/common/lib/update";

// In the sidebar once a newer release has downloaded, until the student
// restarts into it. No dismiss: an update waits for one restart, and the
// toast that announced it may be long gone.
export function UpdateCard() {
  const update = useReadyUpdate();
  const [isRestarting, setIsRestarting] = useState(false);

  if (update === null) {
    return null;
  }

  async function restart() {
    if (update === null) {
      return;
    }
    setIsRestarting(true);
    if (!(await restartIntoUpdate(update))) {
      setIsRestarting(false);
    }
  }

  return (
    <output className="mx-3 mt-3 flex items-center gap-3 rounded-lg bg-primary/8 p-3 ring-1 ring-primary/20 ring-inset dark:bg-primary/15">
      <IconCircleArrowDownFilled
        aria-hidden
        className="size-5 shrink-0 text-primary"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Update ready</p>
        <p className="truncate text-xs text-muted-foreground">
          Rehearse {update.version}
        </p>
      </div>
      <Button
        isLoading={isRestarting}
        onPress={() => {
          void restart();
        }}
        size="sm"
      >
        Restart
      </Button>
    </output>
  );
}
