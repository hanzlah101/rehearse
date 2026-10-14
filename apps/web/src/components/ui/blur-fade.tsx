import { motion } from "motion/react";
import type { HTMLMotionProps } from "motion/react";

// The filter is dropped once shown: a filtered ancestor would stop
// backdrop-filter inside it (the sticky header's blur) from seeing the page.
const SHOWN = {
  filter: "blur(0px)",
  opacity: 1,
  transitionEnd: { filter: "none" },
  y: 0,
};

// Fades content in from a soft blur, rising `offset` px (negative: dropping in
// from above). On mount by default; with `inView`, the first time it scrolls
// into view. Exits the way it came in (AnimatePresence).
export function BlurFade({
  delay = 0,
  duration = 0.5,
  inView = false,
  offset = 8,
  ...props
}: HTMLMotionProps<"div"> & {
  delay?: number;
  duration?: number;
  inView?: boolean;
  offset?: number;
}) {
  const hidden = { filter: "blur(6px)", opacity: 0, y: offset };

  return (
    <motion.div
      exit={hidden}
      initial={hidden}
      transition={{ delay, duration, ease: "easeOut" }}
      {...(inView
        ? { viewport: { margin: "-64px", once: true }, whileInView: SHOWN }
        : { animate: SHOWN })}
      {...props}
    />
  );
}
