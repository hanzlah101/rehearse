import { cn } from "cn";

import { Orb } from "@/components/ui/orb";
import type { OrbState } from "@/components/ui/orb";

// Pastel on purpose: the shader shows its background between petals, so light
// colours keep those gaps soft (saturated ones read as hard wedges).
const ORB_COLORS: [string, string] = ["#D6E2FF", "#8AA9F2"];

// The orb inside a thin ring that fills toward the target while speaking. No
// ring while there's nothing to time. `isCompact` halves it once the talk is
// over: the outer box animates its size for the layout, while the orb itself
// keeps a fixed size and scales with a transform, so the WebGL canvas never
// resizes (resizing it mid-animation redraws late and jumps).
export function OrbFrame({
  getVolume,
  isCompact = false,
  progress,
  state,
}: {
  getVolume?: () => number;
  isCompact?: boolean;
  progress?: number;
  state: OrbState;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 transition-all duration-500 ease-out motion-reduce:transition-none",
        isCompact ? "size-32 md:size-36" : "size-64 md:size-72"
      )}
    >
      <div
        className={cn(
          "absolute top-1/2 left-1/2 size-64 -translate-1/2 transition-transform duration-500 ease-out motion-reduce:transition-none md:size-72",
          isCompact && "scale-50"
        )}
      >
        {progress !== undefined && (
          <svg
            aria-hidden="true"
            className="absolute inset-0 size-full -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              className="fill-none stroke-border"
              cx={50}
              cy={50}
              r={49}
              strokeWidth={0.6}
            />
            <circle
              className="fill-none stroke-primary transition-all duration-1000 ease-linear motion-reduce:transition-none"
              cx={50}
              cy={50}
              pathLength={100}
              r={49}
              strokeDasharray={100}
              strokeDashoffset={100 - Math.min(1, Math.max(0, progress)) * 100}
              strokeLinecap="round"
              strokeWidth={0.9}
            />
          </svg>
        )}
        <div className="absolute inset-2">
          <Orb colors={ORB_COLORS} getVolume={getVolume} state={state} />
        </div>
      </div>
    </div>
  );
}
