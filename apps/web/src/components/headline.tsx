import { motion, useAnimate } from "motion/react";
import { useEffect } from "react";

import {
  DROP_AT,
  DROP_DURATION,
  FLAG_AT,
  HERO_EASE,
} from "@/lib/hero-timeline";

// The page's one moment: "um" is flagged the way the app flags a filler, then
// drops out of the sentence. With reduced motion it's never shown.
export function Headline() {
  const [filler, animate] = useAnimate<HTMLSpanElement>();

  // The drop animates width from "auto", which Motion measures once, when the
  // animation is created. On a first visit the headline font is still loading,
  // so measuring at mount would pin the wider fallback font's width and leave
  // a gap once the real font swaps in. Start it after the fonts load, keeping
  // its place on the hero timeline.
  useEffect(() => {
    const mountedAt = performance.now();
    let isMounted = true;
    let stop: (() => void) | undefined;

    async function dropAfterFonts() {
      await document.fonts.ready;
      if (!isMounted) {
        return;
      }
      const elapsed = (performance.now() - mountedAt) / 1000;
      const controls = animate(
        filler.current,
        { opacity: 0, width: 0 },
        {
          delay: Math.max(0, DROP_AT - elapsed),
          duration: DROP_DURATION,
          ease: HERO_EASE,
        }
      );
      stop = () => {
        controls.stop();
      };
    }
    void dropAfterFonts();

    return () => {
      isMounted = false;
      stop?.();
    };
  }, [animate, filler]);

  return (
    <h1
      aria-label="Say it better the second time."
      className="text-hero font-bold whitespace-nowrap font-stretch-condensed"
    >
      <span aria-hidden>
        Say it
        <span
          className="-my-4 inline-flex overflow-hidden py-4 whitespace-pre motion-reduce:hidden"
          ref={filler}
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
        </span>{" "}
        better <br />
        the second time.
      </span>
    </h1>
  );
}
