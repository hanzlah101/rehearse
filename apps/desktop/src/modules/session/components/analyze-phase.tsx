import { IconCircleCheckFilled } from "@tabler/icons-react";
import { cn } from "cn";
import { useEffect, useEffectEvent, useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { formatNumber } from "@/lib/format";

// The analysis pipeline (PLAN §3), in the order it runs: what each step is
// doing while it runs, and what it found once it's done.
// ponytail: timings and findings are simulated until the pipeline exists;
// drive `step` and `done` from its progress events then.
const STEPS = [
  {
    doing: "Turning the end of your talk into text",
    done: "6:48 of speech, 912 words",
    label: "Transcribing",
    ms: 1400,
  },
  {
    doing: "Measuring silences and how your voice rises and falls",
    done: "Longest pause 2.1s, pitch varied well",
    label: "Pauses and pitch",
    ms: 1600,
  },
  {
    doing: "Counting fillers and repeated phrases",
    done: "5 fillers, 142 words a minute",
    label: "Fillers and pace",
    ms: 1000,
  },
  {
    doing: "Reading every sentence for mistakes",
    done: "3 grammar fixes, 2 stronger words",
    label: "Grammar and vocabulary",
    ms: 2400,
  },
  {
    doing: "Comparing your talk with the topic’s key points",
    done: "4 of 6 key points covered",
    label: "What you explained",
    ms: 1800,
  },
  {
    doing: "Weighing fluency, pace, delivery and language",
    done: "Score ready",
    label: "Scoring",
    ms: 800,
  },
];

// Pause on the finished state before opening the report.
const DONE_MS = 900;

// Chain of checkpoints on one connector line. Every row keeps its height from
// the start, so nothing shifts as steps complete.
export function AnalyzePhase({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const isDone = step >= STEPS.length;
  const finish = useEffectEvent(onDone);

  useEffect(() => {
    const ms = STEPS[step]?.ms;
    const id = setTimeout(() => {
      if (ms === undefined) {
        finish();
      } else {
        setStep((value) => value + 1);
      }
    }, ms ?? DONE_MS);
    return () => {
      clearTimeout(id);
    };
  }, [step]);

  return (
    <section
      aria-label="Analysis"
      className="flex w-full max-w-sm flex-col gap-5 text-left"
    >
      <div className="flex items-baseline justify-between gap-4">
        <p aria-live="polite" className="font-heading text-xl font-semibold">
          {isDone ? "Report ready" : "Analysing your talk"}
        </p>
        <span className="text-sm text-muted-foreground tabular-nums">
          {isDone
            ? "Opening…"
            : `${formatNumber(step + 1)} of ${formatNumber(STEPS.length)}`}
        </span>
      </div>

      <ol className="flex flex-col">
        {STEPS.map((item, index) => {
          const isComplete = index < step;
          const isActive = index === step;
          const isLast = index === STEPS.length - 1;

          return (
            <li
              aria-current={isActive ? "step" : undefined}
              className="flex gap-3"
              key={item.label}
            >
              <div className="flex w-5 shrink-0 flex-col items-center">
                <span className="flex size-5 shrink-0 items-center justify-center">
                  {isComplete && (
                    <IconCircleCheckFilled className="size-5 animate-in text-primary duration-300 zoom-in-50 motion-reduce:animate-none" />
                  )}
                  {isActive && (
                    <span className="text-primary">
                      <Spinner className="size-4" />
                    </span>
                  )}
                  {!isComplete && !isActive && (
                    <span className="size-2 rounded-full bg-border dark:bg-input" />
                  )}
                </span>
                {!isLast && (
                  <span
                    className={cn(
                      "my-1 w-px flex-1 transition-colors duration-500",
                      isComplete ? "bg-primary/50" : "bg-border"
                    )}
                  />
                )}
              </div>

              <div
                className={cn(
                  "flex min-w-0 flex-col gap-0.5",
                  !isLast && "pb-4"
                )}
              >
                <span
                  className={cn(
                    "text-sm leading-5 font-medium",
                    isActive && "text-shimmer",
                    !isComplete && !isActive && "text-muted-foreground/60"
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={cn(
                    "min-h-5 text-sm text-muted-foreground",
                    (isComplete || isActive) &&
                      "animate-in duration-300 fade-in-0 slide-in-from-top-1 motion-reduce:animate-none"
                  )}
                  key={isComplete ? "done" : "doing"}
                >
                  {isComplete && item.done}
                  {isActive && item.doing}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
