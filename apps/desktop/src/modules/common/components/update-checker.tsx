import { useEffect } from "react";
import { toast } from "sonner";

import { downloadUpdate, restartIntoUpdate } from "@/modules/common/lib/update";

// Once per launch (release builds only): download a newer signed release from
// GitHub in the background. A toast announces it once; the sidebar's
// UpdateCard keeps offering the restart until it happens. Never restarts by
// itself, so a talk in progress is never cut off.
async function checkForUpdate() {
  try {
    const update = await downloadUpdate();
    if (update === null) {
      return;
    }
    toast.success(`Rehearse ${update.version} is ready`, {
      action: {
        label: "Restart",
        onClick: () => {
          void restartIntoUpdate(update);
        },
      },
      description: "Restart now, or later from the sidebar.",
    });
  } catch (error) {
    // Offline or no release yet: try again next launch.
    console.warn("[updates] check failed", error);
  }
}

export function UpdateChecker() {
  useEffect(() => {
    if (import.meta.env.PROD) {
      void checkForUpdate();
    }
  }, []);

  return null;
}
