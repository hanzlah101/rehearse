import { redirect } from "@tanstack/react-router";
import { openUrl } from "@tauri-apps/plugin-opener";

// Set once the student has allowed the mic. Some webviews (WKWebView) report
// "prompt" from the Permissions API even after the OS granted access, so this
// remembers the grant; an explicit "denied" from the API still wins.
const GRANTED_KEY = "microphone-granted";

export type MicrophoneAccess = "granted" | "denied" | "prompt";

// Storage can throw (disabled, quota). The in-memory copy keeps the grant for
// this run either way, so the guard doesn't bounce back to onboarding.
let isGrantedThisRun = false;

function isRemembered() {
  try {
    return isGrantedThisRun || localStorage.getItem(GRANTED_KEY) === "true";
  } catch {
    return isGrantedThisRun;
  }
}

function remember(isGranted: boolean) {
  isGrantedThisRun = isGranted;

  try {
    if (isGranted) {
      localStorage.setItem(GRANTED_KEY, "true");
    } else {
      localStorage.removeItem(GRANTED_KEY);
    }
  } catch {
    // Remembered for this run only; the next launch asks again.
  }
}

export async function getMicrophoneAccess(): Promise<MicrophoneAccess> {
  const remembered = isRemembered();

  try {
    const { state } = await navigator.permissions.query({ name: "microphone" });

    if (state === "denied") {
      remember(false);
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
  let stream: MediaStream;

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    remember(false);

    return error instanceof DOMException &&
      (error.name === "NotFoundError" || error.name === "OverconstrainedError")
      ? "no-device"
      : "denied";
  }

  for (const track of stream.getTracks()) {
    track.stop();
  }
  remember(true);

  return "granted";
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
