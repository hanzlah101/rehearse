import { motion } from "motion/react";

import {
  DROP_AT,
  DROP_DURATION,
  FLAG_AT,
  HERO_EASE,
} from "@/lib/hero-timeline";

// The page's one moment: "um" is flagged the way the app flags a filler, then
// drops out of the sentence. With reduced motion it's never shown.
export function Headline() {
  return (
    <h1
      aria-label="Say it better the second time."
      className="text-hero font-bold whitespace-nowrap font-stretch-condensed"
    >
      <span aria-hidden>
        Say it
        <motion.span
          animate={{ opacity: 0, width: 0 }}
          className="-my-4 inline-flex overflow-hidden py-4 whitespace-pre motion-reduce:hidden"
          transition={{
            delay: DROP_AT,
            duration: DROP_DURATION,
            ease: HERO_EASE,
          }}
        >
          ,{" "}
          <span className="relative isolate inline-block px-1">
            <motion.span
              animate={{ clipPath: "inset(0 0% 0 0)" }}
              className="absolute inset-0 -z-10 rounded-xl bg-chart-3/20 ring-2 ring-chart-3/50 ring-inset"
              initial={{ clipPath: "inset(0 100% 0 0)" }}
              transition={{ delay: FLAG_AT, duration: 0.45, ease: HERO_EASE }}
            />
            um
          </span>
          ,
        </motion.span>{" "}
        better <br />
        the second time.
      </span>
    </h1>
  );
}
