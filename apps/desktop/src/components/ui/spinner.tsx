import { cn } from "cn";
import type * as React from "react";

// One spoke per 30°. Each starts its fade a step later than the last (negative
// delays, so every spoke is mid-cycle on the first frame), which makes a bright
// spoke sweep round. Delays are literal classes so Tailwind can see them; keep
// them in steps of the 1.2s cycle in index.css (--animate-spinner-spoke) / 12.
const SPOKE_DELAYS = [
  "[animation-delay:-1200ms]",
  "[animation-delay:-1100ms]",
  "[animation-delay:-1000ms]",
  "[animation-delay:-900ms]",
  "[animation-delay:-800ms]",
  "[animation-delay:-700ms]",
  "[animation-delay:-600ms]",
  "[animation-delay:-500ms]",
  "[animation-delay:-400ms]",
  "[animation-delay:-300ms]",
  "[animation-delay:-200ms]",
  "[animation-delay:-100ms]",
];

// Sized in em so it follows the surrounding text unless a size-* class (or a
// parent rule like Button's) sets it.
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      aria-hidden
      data-slot="spinner"
      fill="none"
      height="1em"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width="1em"
      className={cn("shrink-0", className)}
      {...props}
    >
      {SPOKE_DELAYS.map((delay, index) => (
        <line
          key={delay}
          className={cn("animate-spinner-spoke", delay)}
          transform={`rotate(${index * 30} 12 12)`}
          x1="12"
          x2="12"
          y1="3"
          y2="7.5"
        />
      ))}
    </svg>
  );
}

export { Spinner };
