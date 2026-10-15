import { IconCircleArrowDownFilled } from "@tabler/icons-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatNumber } from "@/lib/format";
import {
  restartIntoUpdate,
  useDownloadingUpdate,
  useReadyUpdate,
} from "@/modules/common/lib/update";

// A small spinner by the logo while a newer release downloads in the
// background; hovering it says what and how far. UpdateCard takes over once
// it's ready.
export function UpdateDownloadIndicator() {
  const download = useDownloadingUpdate();
  if (download === null) {
    return null;
  }
  const label = `Downloading Rehearse ${download.version}${
    download.fraction === null
      ? ""
      : ` · ${formatNumber(download.fraction, { maximumFractionDigits: 0, style: "percent" })}`
  }`;

  return (
    <output
      aria-label={label}
      className="ml-auto flex text-muted-foreground"
      title={label}
    >
      <Spinner className="size-3.5" />
    </output>
  );
}

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

  // Restart sits under the text at full width, so its spinner can't squeeze
  // the title onto a second line.
  return (
    <output className="mx-3 mt-3 flex flex-col gap-3 rounded-lg bg-primary/8 p-3 ring-1 ring-primary/20 ring-inset dark:bg-primary/15">
      <div className="flex items-center gap-3">
        <IconCircleArrowDownFilled
          aria-hidden
          className="size-5 shrink-0 text-primary"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Update ready</p>
          <p className="truncate text-xs text-muted-foreground">
            Rehearse {update.version}
          </p>
        </div>
      </div>
      <Button
        className="w-full"
        isLoading={isRestarting}
        onPress={() => {
          void restart();
        }}
        size="sm"
      >
        Restart to update
      </Button>
    </output>
  );
}
