import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import type { DownloadEvent, Update } from "@tauri-apps/plugin-updater";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";

// A newer signed release, downloaded and waiting for a restart. Shared by the
// toast (UpdateChecker) and the sidebar card (UpdateCard).
let readyUpdate: Update | null = null;
// The release being downloaded, for the sidebar's small indicator; fraction
// is null until the size is known.
type Downloading = { fraction: number | null; version: string };
let downloading: Downloading | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useReadyUpdate() {
  return useSyncExternalStore(subscribe, () => readyUpdate);
}

export function useDownloadingUpdate() {
  return useSyncExternalStore(subscribe, () => downloading);
}

// Downloads a newer release from GitHub (latest.json) in the background,
// without installing it: on Windows, installing closes the app, so that only
// happens when the student chooses to restart. Null when there's none.
export async function downloadUpdate() {
  const update = await check();
  if (update === null) {
    return null;
  }
  let total = 0;
  let received = 0;
  downloading = { fraction: null, version: update.version };
  emit();
  try {
    await update.download((event: DownloadEvent) => {
      if (event.event === "Started") {
        total = event.data.contentLength ?? 0;
        return;
      }
      if (event.event !== "Progress" || total === 0) {
        return;
      }
      received += event.data.chunkLength;
      // Whole percents only, so the sidebar doesn't re-render per chunk.
      const fraction = Math.min(1, Math.floor((received / total) * 100) / 100);
      if (fraction !== downloading?.fraction) {
        downloading = { fraction, version: update.version };
        emit();
      }
    });
  } finally {
    downloading = null;
    emit();
  }
  readyUpdate = update;
  emit();
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
