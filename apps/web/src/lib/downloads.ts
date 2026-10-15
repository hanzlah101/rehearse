import { useSyncExternalStore } from "react";

// Every installer is attached to the latest GitHub Release
// (.github/workflows/release-desktop.yml). Its file names carry the version,
// so the site links to /download/<id> (routes/download.$id.ts), which finds
// the file in the latest release by how its name ends.
export const RELEASES_URL =
  "https://github.com/hanzlah101/rehearse/releases/latest";
export const LATEST_RELEASE_API =
  "https://api.github.com/repos/hanzlah101/rehearse/releases/latest";

export const DOWNLOADS = {
  linux: { fileEnding: ".AppImage", label: "Linux" },
  "linux-deb": { fileEnding: ".deb", label: ".deb" },
  "linux-rpm": { fileEnding: ".rpm", label: ".rpm" },
  macos: { fileEnding: "_aarch64.dmg", label: "macOS" },
  "macos-intel": { fileEnding: "_x64.dmg", label: "Intel Macs" },
  windows: { fileEnding: "-setup.exe", label: "Windows" },
} as const;

export type DownloadId = keyof typeof DOWNLOADS;

export function isDownloadId(value: string): value is DownloadId {
  return Object.hasOwn(DOWNLOADS, value);
}

export function downloadUrl(id: DownloadId) {
  return `/download/${id}`;
}

export type Os = "linux" | "macos" | "windows";

function detectOs(): Os | "unknown" {
  const agent = navigator.userAgent;

  // Phones and tablets can't run the app, so they get no direct download.
  if (/iPhone|iPad|Android/iu.test(agent)) {
    return "unknown";
  }
  if (/Mac/iu.test(agent)) {
    return "macos";
  }
  if (/Win/iu.test(agent)) {
    return "windows";
  }
  if (/Linux|X11/iu.test(agent)) {
    return "linux";
  }
  return "unknown";
}

function unsubscribe() {
  // Nothing to clean up: see subscribe.
}

// The OS never changes while the page is open.
function subscribe() {
  return unsubscribe;
}

// The visitor's OS: "pending" on the server and until hydration, so markup
// rendered on the server never guesses.
export function useOs() {
  return useSyncExternalStore(subscribe, detectOs, () => "pending" as const);
}
