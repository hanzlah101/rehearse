import { cn } from "cn";
import { useId, useState } from "react";
import { ToggleButton, ToggleButtonGroup } from "react-aria-components";

import { formatNumber } from "@/lib/format";
import { TARGET_LENGTHS } from "@/modules/rehearsal/lib/topics";
import type { TargetLength } from "@/modules/rehearsal/lib/topics";

const BARS_PER_MINUTE = 4;
const TOTAL_MINUTES = 10;

// Literal class lists so Tailwind generates them.
const BAR_HEIGHTS = [
  "h-2",
  "h-3",
  "h-4",
  "h-5",
  "h-6",
  "h-7",
  "h-8",
  "h-9",
  "h-10",
  "h-11",
  "h-12",
];
const STOP_SPANS = ["", "col-span-1", "col-span-2", "col-span-3"];
// Fills and previews spread out from the current length, a minute at a time.
const MINUTE_DELAYS = [
  "delay-0",
  "delay-30",
  "delay-60",
  "delay-90",
  "delay-120",
  "delay-150",
  "delay-180",
  "delay-210",
  "delay-240",
  "delay-270",
];

// A fixed, voice-like contour so the picker reads as the talk's waveform:
// every minute is a few bars, and the chosen length lights up.
const bars = Array.from(
  { length: TOTAL_MINUTES * BARS_PER_MINUTE },
  (_, index) =>
    BAR_HEIGHTS[
      Math.round(
        (BAR_HEIGHTS.length - 1) *
          Math.abs(Math.sin(index * 1.7) * Math.cos(index * 0.45))
      )
    ]
);

export function LengthPicker({
  onChange,
  value,
}: {
  onChange: (length: TargetLength) => void;
  value: TargetLength;
}) {
  const labelId = useId();
  // Hovering a stop previews it: added bars tint, dropped bars fade.
  const [hovered, setHovered] = useState<number | null>(null);
  const preview = hovered ?? value.minutes;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span id={labelId} className="font-medium">
          Length
        </span>
        <span className="text-muted-foreground">{value.label}</span>
      </div>

      <ToggleButtonGroup
        aria-labelledby={labelId}
        className="grid grid-cols-10 gap-1"
        disallowEmptySelection
        onSelectionChange={(keys) => {
          const next = TARGET_LENGTHS.find((option) =>
            keys.has(option.minutes)
          );

          if (next !== undefined) {
            onChange(next);
          }
        }}
        selectedKeys={[value.minutes]}
        selectionMode="single"
      >
        {TARGET_LENGTHS.map((option, index) => {
          // Each stop covers the minutes since the previous one.
          const from = index === 0 ? 0 : TARGET_LENGTHS[index - 1].minutes;

          return (
            <ToggleButton
              aria-label={`${formatNumber(option.minutes)} minutes`}
              className={cn(
                "group/stop flex cursor-default flex-col gap-2 rounded-md outline-hidden data-focus-visible:outline-2 data-focus-visible:outline-offset-4 data-focus-visible:outline-ring data-focus-visible:outline-solid",
                STOP_SPANS[option.minutes - from]
              )}
              id={option.minutes}
              key={option.minutes}
              onHoverChange={(isHovering) => {
                setHovered(isHovering ? option.minutes : null);
              }}
            >
              <span className="flex h-12 items-center gap-1">
                {bars
                  .slice(
                    from * BARS_PER_MINUTE,
                    option.minutes * BARS_PER_MINUTE
                  )
                  .map((height, bar) => {
                    const position = from * BARS_PER_MINUTE + bar;
                    const minute = Math.floor(position / BARS_PER_MINUTE);
                    const isFilled = minute < value.minutes;
                    const isPreviewed = minute < preview;

                    return (
                      <span
                        className={cn(
                          "min-w-0 flex-1 rounded-full transition-colors duration-300 ease-out motion-reduce:transition-none",
                          height,
                          MINUTE_DELAYS[Math.abs(minute - value.minutes)],
                          isFilled && isPreviewed && "bg-primary",
                          isFilled && !isPreviewed && "bg-primary/40",
                          !isFilled && isPreviewed && "bg-primary/35",
                          !isFilled && !isPreviewed && "bg-border dark:bg-input"
                        )}
                        key={position}
                      />
                    );
                  })}
              </span>
              <span className="self-end text-xs whitespace-nowrap text-muted-foreground tabular-nums group-data-hovered/stop:text-foreground group-data-selected/stop:font-semibold group-data-selected/stop:text-foreground">
                {formatNumber(option.minutes)} min
              </span>
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>
    </div>
  );
}
