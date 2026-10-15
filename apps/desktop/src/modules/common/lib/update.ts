import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import type { Update } from "@tauri-apps/plugin-updater";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";

// A newer signed release, downloaded and waiting for a restart. Shared by the
// toast (UpdateChecker) and the sidebar card (UpdateCard).
let readyUpdate: Update | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useReadyUpdate() {
  return useSyncExternalStore(subscribe, () => readyUpdate);
}

// Downloads a newer release from GitHub (latest.json) in the background,
// without installing it: on Windows, installing closes the app, so that only
// happens when the student chooses to restart. Null when there's none.
export async function downloadUpdate() {
  const update = await check();
  if (update === null) {
    return null;
  }
  await update.download();
  readyUpdate = update;
  for (const listener of listeners) {
    listener();
  }
  return update;
}

// Installs the downloaded update and restarts into it. On Windows the
// installer closes the app itself, so relaunch is never reached there.
// Resolves false (after a toast) if installing failed.
export async function restartIntoUpdate(update: Update) {
  try {
    await update.install();
    await relaunch();
    return true;
  } catch (error) {
    console.warn("[updates] install failed", error);
    toast.error(
      "Couldn't install the update. Try again, or download it from the website."
    );
    return false;
  }
}
