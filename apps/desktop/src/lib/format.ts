import { NumberFormatter } from "@internationalized/number";

// Every number the UI shows goes through here, so formatting stays consistent
// and one place can change it. The UI is English-only, so one locale.
// NumberFormatter caches its Intl.NumberFormat per locale + options.
const LOCALE = "en-US";

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
) {
  return new NumberFormatter(LOCALE, options).format(value);
}

// Scores are whole percents, 0–100: 78 → "78%".
export function formatPercent(value: number) {
  return formatNumber(value / 100, {
    maximumFractionDigits: 0,
    style: "percent",
  });
}

// A change between attempts: "+7", "-3", "0".
export function formatDelta(value: number, options?: Intl.NumberFormatOptions) {
  return formatNumber(value, { signDisplay: "exceptZero", ...options });
}

// Timers and recordings, whole seconds as m:ss: 291 → "4:51".
export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));

  return `${formatNumber(Math.floor(seconds / 60))}:${formatNumber(seconds % 60, { minimumIntegerDigits: 2 })}`;
}
