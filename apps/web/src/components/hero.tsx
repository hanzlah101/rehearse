import { DownloadButtons } from "@/components/download-buttons";
import { Headline } from "@/components/headline";
import { BlurFade } from "@/components/ui/blur-fade";

export function Hero() {
  return (
    <section className="pt-10 sm:pt-16 lg:pt-20">
      <BlurFade duration={0.6}>
        <Headline />
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
