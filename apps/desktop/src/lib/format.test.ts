import { expect, test } from "bun:test";

import {
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
