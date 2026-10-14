import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light" | "system";

// Follows the OS ("system", nothing stored) until the user picks light or
// dark in Settings, then remembers their choice.
const STORAGE_KEY = "theme";
const darkScheme = window.matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set<() => void>();

function getTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : "system";
}

function isDark() {
  const theme = getTheme();
  return theme === "system" ? darkScheme.matches : theme === "dark";
}

function sync() {
  document.documentElement.classList.toggle("dark", isDark());
  for (const listener of listeners) {
    listener();
  }
}

sync();
darkScheme.addEventListener("change", sync);

// Handle for the pending no-transitions removal, so rapid toggles don't
// re-enable transitions while a later swap is still painting.
let restoreFrame = 0;

function setTheme(theme: Theme) {
  if (theme === "system") {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, theme);
  }
  // Swap colors instantly: mismatched per-element transitions look like a flicker.
  const html = document.documentElement;
  html.classList.add("no-transitions");
  sync();
  cancelAnimationFrame(restoreFrame);
  restoreFrame = requestAnimationFrame(() => {
    restoreFrame = requestAnimationFrame(() => {
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

function useTheme() {
  return useSyncExternalStore(subscribe, getTheme);
}

function useIsDark() {
  return useSyncExternalStore(subscribe, isDark);
}

export { setTheme, useIsDark, useTheme };
