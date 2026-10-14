import { IconLockFilled } from "@tabler/icons-react";

import { BlurFade } from "@/components/ui/blur-fade";

// Mark styles from the app's annotated transcript
// (apps/desktop/src/modules/rehearsal/components/annotated-transcript.tsx).
const FILLER =
  "rounded-md bg-chart-3/20 px-1 font-medium text-foreground ring-1 ring-chart-3/50 ring-inset";
const PAUSE =
  "mx-0.5 inline-flex items-center rounded-full bg-chart-2/15 px-1.5 align-middle text-xs leading-5 font-medium text-chart-2 tabular-nums ring-1 ring-chart-2/40 ring-inset";
const STRESS =
  "font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4";

const FEATURES = [
  {
    body: "Fillers, long silences, pace and pitch are measured from your recording, then explained in plain words next to what you said.",
    specimen: (
      <>
        So, <span className={FILLER}>um</span>, the plan is
      </>
    ),
    title: "Hear what they hear",
  },
  {
    body: "Your own talk comes back as a script: clearer wording, a pause where each filler was, and the words worth stressing.",
    specimen: (
      <>
        Second, <span className={PAUSE}>0.5s</span> search is{" "}
        <span className={STRESS}>faster</span>.
      </>
    ),
    title: "Read a better version",
  },
  {
    body: "Speech is transcribed on your machine. Only the text goes out for feedback; the audio never leaves it.",
    specimen: (
      <>
        <IconLockFilled
          aria-hidden
          className="mr-1.5 inline size-4 align-[-2px] text-muted-foreground"
        />
        Stays on this computer
      </>
    ),
    title: "Your voice stays with you",
  },
];

// Three columns on a shared subgrid, so the specimens, rules and headings line
// up across them. Each fades in a little slower than the one before.
export function Features() {
  return (
    <section
      aria-label="How it helps"
      className="mt-24 grid gap-12 sm:mt-32 md:grid-cols-3 md:gap-x-10 md:gap-y-0"
    >
      {FEATURES.map(({ body, specimen, title }, index) => (
        <BlurFade
          className="grid md:row-span-3 md:grid-rows-subgrid"
          delay={index * 0.1}
          duration={0.5 + index * 0.2}
          inView
          key={title}
        >
          <p className="border-b pb-5 leading-7">{specimen}</p>
          <h2 className="mt-5 text-xl font-semibold">{title}</h2>
          <p className="mt-2 leading-relaxed text-pretty text-muted-foreground">
            {body}
          </p>
        </BlurFade>
      ))}
    </section>
  );
}
