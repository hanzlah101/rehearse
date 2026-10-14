import { motion } from "motion/react";

import { DownloadButtons } from "@/components/download-buttons";
import { Headline } from "@/components/headline";
import { HeroWaveform } from "@/components/hero-waveform";
import { BlurFade } from "@/components/ui/blur-fade";

export function Hero() {
  return (
    <section className="relative isolate pt-10 sm:pt-16 lg:pt-20">
      {/* A soft cobalt glow behind the headline, slowly breathing. */}
      <motion.div
        animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.06, 1] }}
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 -z-10 h-96 w-2/3 rounded-full bg-primary/12 blur-3xl dark:bg-primary/20"
        transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
      />
      <BlurFade duration={0.6}>
        <Headline />
      </BlurFade>
      <BlurFade delay={0.1} duration={0.6}>
        <HeroWaveform />
      </BlurFade>
      <BlurFade delay={0.15} duration={0.6}>
        <p className="mt-8 max-w-xl text-lg text-pretty text-muted-foreground">
          Record a practice run of your next presentation or meeting. Rehearse
          marks every filler, long pause and slip, hands you a better version to
          read aloud, and scores the next try so you can hear yourself improve.
        </p>
      </BlurFade>
      <BlurFade
        className="mt-10 scroll-mt-24"
        delay={0.25}
        duration={0.6}
        id="download"
      >
        <DownloadButtons />
        <p className="mt-4 max-w-md text-sm text-pretty text-muted-foreground">
          Free. The first launch downloads a 1.6 GB speech model, so your voice
          is transcribed on your own computer.
        </p>
      </BlurFade>
    </section>
  );
}
