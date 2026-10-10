import { useSyncExternalStore } from "react";

// Follows the OS until the user picks a theme, then remembers their choice.
const STORAGE_KEY = "theme";
const darkScheme = window.matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set<() => void>();

function isDark() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === null ? darkScheme.matches : stored === "dark";
}

function sync() {
  document.documentElement.classList.toggle("dark", isDark());
  for (const listener of listeners) {
    listener();
  }
}

sync();
darkScheme.addEventListener("change", sync);

function setDark(dark: boolean) {
  localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  // Swap colors instantly: mismatched per-element transitions look like a flicker.
  const html = document.documentElement;
  html.classList.add("no-transitions");
  sync();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      html.classList.remove("no-transitions");
    });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function useIsDark() {
  return useSyncExternalStore(subscribe, isDark);
}

export { setDark, useIsDark };
