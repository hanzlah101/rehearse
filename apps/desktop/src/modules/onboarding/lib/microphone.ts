import { redirect } from "@tanstack/react-router";
import { openUrl } from "@tauri-apps/plugin-opener";

// Set once the student has allowed the mic. Some webviews (WKWebView) report
// "prompt" from the Permissions API even after the OS granted access, so this
// remembers the grant; an explicit "denied" from the API still wins.
const GRANTED_KEY = "microphone-granted";

export type MicrophoneAccess = "granted" | "denied" | "prompt";

export async function getMicrophoneAccess(): Promise<MicrophoneAccess> {
  const remembered = localStorage.getItem(GRANTED_KEY) === "true";

  try {
    const { state } = await navigator.permissions.query({ name: "microphone" });

    if (state === "denied") {
      localStorage.removeItem(GRANTED_KEY);
    }

    return state === "prompt" && remembered ? "granted" : state;
  } catch {
    // No Permissions API for "microphone" in this webview.
    return remembered ? "granted" : "prompt";
  }
}

export type MicrophoneRequest = "granted" | "denied" | "no-device";

// Opens the mic once (showing the OS prompt the first time) and releases it.
export async function requestMicrophone(): Promise<MicrophoneRequest> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    for (const track of stream.getTracks()) {
      track.stop();
    }
    localStorage.setItem(GRANTED_KEY, "true");

    return "granted";
  } catch (error) {
    localStorage.removeItem(GRANTED_KEY);

    return error instanceof DOMException &&
      (error.name === "NotFoundError" || error.name === "OverconstrainedError")
      ? "no-device"
      : "denied";
  }
}

// The OS page where the student can turn the mic back on, if this platform has
// one we can open (macOS, Windows). Linux desktops vary, so they get none.
const SETTINGS_URLS: Record<string, string> = {
  Mac: "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
  Windows: "ms-settings:privacy-microphone",
};

export const MICROPHONE_SETTINGS_URL = Object.entries(SETTINGS_URLS).find(
  ([platform]) => navigator.userAgent.includes(platform)
)?.[1];

export async function openMicrophoneSettings() {
  if (MICROPHONE_SETTINGS_URL !== undefined) {
    await openUrl(MICROPHONE_SETTINGS_URL);
  }
}

// beforeLoad for screens that record: until the mic is allowed, onboarding.
export async function requireMicrophone() {
  if ((await getMicrophoneAccess()) !== "granted") {
    throw redirect({ replace: true, to: "/onboarding" });
  }
}
