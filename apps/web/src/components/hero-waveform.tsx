import { motion, useReducedMotion } from "motion/react";

import { DROP_AT, DROP_DURATION, HERO_EASE } from "@/lib/hero-timeline";

const BAR_COUNT = 64;
// Bars [FILLER_START, FILLER_END) are the spoken "um".
const FILLER_START = 22;
const FILLER_END = 28;

// A deterministic stretch of "speech": word-sized swells with softer dips
// between them, the same on the server and the client.
const HEIGHTS = Array.from(
  { length: BAR_COUNT },
  (_, index) =>
    0.16 +
    0.84 *
      (0.5 + 0.5 * Math.sin(index * 0.42)) *
      (0.55 + 0.45 * Math.abs(Math.sin(index * 1.3)))
);

function percent(value: number) {
  return `${String(Math.round(value * 100))}%`;
}

// One slot per bar, so the filler's group spaces its bars like the rest.
// Height, not scaleY, so the pills keep their round ends at any size (and
// height isn't paused by MotionConfig's reduced motion, hence the check).
// On phones every other bar outside the filler is hidden, so the row isn't
// crowded and the filler's gap is wide enough for the pause chip.
function Bar({ index, isFiller }: { index: number; isFiller: boolean }) {
  const isReduced = useReducedMotion() === true;
  const height = HEIGHTS[index] ?? 0.5;

  return (
    <span
      className={
        !isFiller && index % 2 === 1
          ? "flex h-full flex-1 items-center justify-center max-sm:hidden"
          : "flex h-full flex-1 items-center justify-center"
      }
    >
      <motion.span
        animate={
          isReduced
            ? undefined
            : {
                height: [
                  percent(height),
                  percent(height * 0.55),
                  percent(height),
                ],
              }
        }
        className={
          isFiller
            ? "w-1 rounded-full bg-chart-3 sm:w-1.5"
            : "w-1 rounded-full bg-primary/70 sm:w-1.5"
        }
        initial={{ height: percent(height) }}
        transition={{
          delay: (index % 7) * 0.08,
          duration: 1.3 + (index % 5) * 0.15,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
    </span>
  );
}

// The voice behind the headline, drawn with the logo's bars and fading out at
// both ends. The amber run is the "um": when the headline drops it, those bars
// sink away and a 0.5s pause takes their place, as in the better version.
export function HeroWaveform() {
  return (
    <div
      aria-hidden
      className="mt-10 flex h-14 items-center mask-x-from-85% sm:h-20"
    >
      {HEIGHTS.slice(0, FILLER_START).map((_, index) => (
        // oxlint-disable-next-line react/no-array-index-key -- fixed bars
        <Bar index={index} isFiller={false} key={index} />
      ))}

      <span className="relative flex h-full flex-6 items-center justify-center">
        <motion.span
          animate={{ height: "10%", opacity: 0 }}
          className="flex h-full w-full items-center"
          transition={{
            delay: DROP_AT,
            duration: DROP_DURATION,
            ease: HERO_EASE,
          }}
        >
          {HEIGHTS.slice(FILLER_START, FILLER_END).map((_, offset) => (
            <Bar
              index={FILLER_START + offset}
              isFiller
              // oxlint-disable-next-line react/no-array-index-key -- fixed bars
              key={offset}
            />
          ))}
        </motion.span>
        <motion.span
          animate={{ filter: "blur(0px)", opacity: 1, scale: 1 }}
          className="absolute rounded-full bg-chart-2/15 px-1.5 text-xs leading-5 font-medium text-chart-2 tabular-nums ring-1 ring-chart-2/40 ring-inset"
          initial={{ filter: "blur(4px)", opacity: 0, scale: 0.8 }}
          transition={{
            delay: DROP_AT + DROP_DURATION * 0.6,
            duration: 0.4,
            ease: "easeOut",
          }}
        >
          0.5s
        </motion.span>
      </span>

      {HEIGHTS.slice(FILLER_END).map((_, offset) => (
        <Bar
          index={FILLER_END + offset}
          isFiller={false}
          // oxlint-disable-next-line react/no-array-index-key -- fixed bars
          key={FILLER_END + offset}
        />
      ))}
    </div>
  );
}
