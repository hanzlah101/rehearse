import { useSyncExternalStore } from "react";

import { downloadModel, getModelStatus } from "@/modules/analysis/lib/speech";
import type { DownloadProgress } from "@/modules/analysis/lib/speech";

// The speech model (~1.6 GB) on this computer: one download app-wide, shared
// by the download dialog and the analysis runner, so both follow the same
// progress and the Rust side never sees two downloads at once.
export type SpeechModel =
  | { status: "checking" }
  | { status: "missing" }
  | ({ status: "downloading" } & DownloadProgress)
  | { status: "ready" }
  | { error: string; status: "failed" };

let model: SpeechModel = { status: "checking" };
let download: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setModel(next: SpeechModel) {
  model = next;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeSpeechModel(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSpeechModel() {
  return model;
}

export function useSpeechModel() {
  return useSyncExternalStore(subscribeSpeechModel, getSpeechModel);
}

// Asks Rust whether the model is on disk. True when it's ready to use.
export async function checkSpeechModel() {
  const { ready } = await getModelStatus();
  if (download === null) {
    setModel({ status: ready ? "ready" : "missing" });
  }
  return ready;
}

async function runDownload() {
  const { ready, totalBytes } = await getModelStatus();
  if (ready) {
    setModel({ status: "ready" });
    return;
  }

  setModel({ downloadedBytes: 0, status: "downloading", totalBytes });
  try {
    await downloadModel((progress) => {
      setModel({ status: "downloading", ...progress });
    });
    setModel({ status: "ready" });
  } catch (error) {
    // Rust rejects with a message meant for the student.
    setModel({
      error:
        typeof error === "string"
          ? error
          : "Couldn't download the speech model. Try again.",
      status: "failed",
    });
    throw error;
  }
}

// Starts the download, or joins the one already running. Resumes a partial
// download and is a no-op once the model is there.
export async function downloadSpeechModel() {
  download ??= runDownload();
  try {
    await download;
  } finally {
    download = null;
  }
}
