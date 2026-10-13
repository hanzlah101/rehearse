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

function startOfDay(day: Date) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
}

// Local calendar days between two moments: 0 = same day, 1 = yesterday.
export function daysAgo(date: Date, now = new Date()) {
  return Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
}

const timeFormat = new Intl.DateTimeFormat(LOCALE, { timeStyle: "short" });
const dayFormat = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
});
const dayYearFormat = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const weekdayFormat = new Intl.DateTimeFormat(LOCALE, { weekday: "short" });

// When, briefly (for lists already grouped by day): "10:24 AM" today or
// yesterday, "Mon" within the week, "Oct 9" (or "Oct 9, 2025") before.
export function formatWhen(date: Date, now = new Date()) {
  const ago = daysAgo(date, now);

  if (ago <= 1) {
    return timeFormat.format(date);
  }
  if (ago < 7) {
    return weekdayFormat.format(date);
  }

  return date.getFullYear() === now.getFullYear()
    ? dayFormat.format(date)
    : dayYearFormat.format(date);
}

// When something happened: "Today, 10:24 AM", "Yesterday, 9:40 PM",
// "Oct 9, 6:12 PM", or with the year once it's a different one.
export function formatDateTime(date: Date, now = new Date()) {
  const ago = daysAgo(date, now);
  const time = timeFormat.format(date);

  if (ago === 0) {
    return `Today, ${time}`;
  }
  if (ago === 1) {
    return `Yesterday, ${time}`;
  }

  const day =
    date.getFullYear() === now.getFullYear()
      ? dayFormat.format(date)
      : dayYearFormat.format(date);

  return `${day}, ${time}`;
}
