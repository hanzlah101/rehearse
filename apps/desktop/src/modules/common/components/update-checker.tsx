import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { useEffect } from "react";
import { toast } from "sonner";

// Once per launch (release builds only): download a newer signed release
// from GitHub in the background, then offer to restart into it. Never
// restarts by itself, so a talk in progress is never cut off.
async function downloadUpdate() {
  try {
    const update = await check();
    if (update === null) {
      return;
    }
    await update.downloadAndInstall();
    toast.success(`Rehearse ${update.version} is ready`, {
      action: {
        label: "Restart",
        onClick: () => {
          void relaunch();
        },
      },
      description: "Restart to finish updating.",
      duration: Infinity,
    });
  } catch (error) {
    // Offline or no release yet: try again next launch.
    console.warn("[updates] check failed", error);
  }
}

export function UpdateChecker() {
  useEffect(() => {
    if (import.meta.env.PROD) {
      void downloadUpdate();
    }
  }, []);

  return null;
}
