import { expect, test } from "bun:test";

import {
  daysAgo,
  formatDateTime,
  formatWhen,
  formatDelta,
  formatDuration,
  formatNumber,
  formatPercent,
} from "@/lib/format";

test("formats numbers, percents, deltas and durations", () => {
  expect(formatNumber(1234.5, { maximumFractionDigits: 1 })).toBe("1,234.5");
  expect(formatPercent(78)).toBe("78%");
  expect(formatDelta(7)).toBe("+7");
  expect(formatDelta(-3)).toBe("-3");
  expect(formatDelta(0)).toBe("0");
  expect(formatDuration(291)).toBe("4:51");
  expect(formatDuration(5.9)).toBe("0:05");
  expect(formatDuration(-1)).toBe("0:00");
});

test("formats dates relative to today", () => {
  const now = new Date(2026, 9, 12, 15, 0);

  expect(daysAgo(new Date(2026, 9, 12, 0, 5), now)).toBe(0);
  expect(daysAgo(new Date(2026, 9, 11, 23, 59), now)).toBe(1);
  expect(formatDateTime(new Date(2026, 9, 12, 10, 24), now)).toBe(
    "Today, 10:24 AM"
  );
  expect(formatDateTime(new Date(2026, 9, 11, 21, 40), now)).toBe(
    "Yesterday, 9:40 PM"
  );
  expect(formatDateTime(new Date(2026, 9, 9, 18, 12), now)).toBe(
    "Oct 9, 6:12 PM"
  );
  expect(formatDateTime(new Date(2025, 11, 30, 9, 0), now)).toBe(
    "Dec 30, 2025, 9:00 AM"
  );
  // Brief, for lists grouped by day (Oct 12 2026 is a Monday).
  expect(formatWhen(new Date(2026, 9, 12, 10, 24), now)).toBe("10:24 AM");
  expect(formatWhen(new Date(2026, 9, 11, 21, 40), now)).toBe("9:40 PM");
  expect(formatWhen(new Date(2026, 9, 8, 9, 0), now)).toBe("Thu");
  expect(formatWhen(new Date(2026, 9, 1, 9, 0), now)).toBe("Oct 1");
  expect(formatWhen(new Date(2025, 11, 30, 9, 0), now)).toBe("Dec 30, 2025");
});
