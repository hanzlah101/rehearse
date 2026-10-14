import { motion } from "motion/react";

const EASE = [0.65, 0, 0.35, 1] as const;

// The page's one moment: "um" is flagged the way the app flags a filler, then
// drops out of the sentence. With reduced motion it's never shown.
export function Headline() {
  return (
    <h1
      aria-label="Say it better the second time."
      className="text-6xl leading-none font-bold font-stretch-condensed sm:text-7xl md:text-8xl lg:text-9xl"
    >
      <span aria-hidden>
        Say it
        <motion.span
          animate={{ opacity: 0, width: 0 }}
          className="-my-4 inline-flex overflow-hidden py-4 whitespace-pre motion-reduce:hidden"
          transition={{ delay: 1.9, duration: 0.65, ease: EASE }}
        >
          ,{" "}
          <span className="relative isolate inline-block px-1">
            <motion.span
              animate={{ clipPath: "inset(0 0% 0 0)" }}
              className="absolute inset-0 -z-10 rounded-xl bg-chart-3/20 ring-2 ring-chart-3/50 ring-inset"
              initial={{ clipPath: "inset(0 100% 0 0)" }}
              transition={{ delay: 0.6, duration: 0.45, ease: EASE }}
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
