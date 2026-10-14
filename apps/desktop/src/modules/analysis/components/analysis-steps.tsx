import {
  IconAlertCircleFilled,
  IconCircleCheckFilled,
} from "@tabler/icons-react";
import { cn } from "cn";

import { Spinner } from "@/components/ui/spinner";
import { formatPercent } from "@/lib/format";
import type {
  AnalysisProgress,
  AnalysisStage,
  Findings,
} from "@/modules/analysis/lib/runner";

export type Step = {
  doing: string;
  done: string;
  label: string;
};

type StepKey = keyof Findings;

const ANALYSIS_STEPS: { key: StepKey; label: string }[] = [
  { key: "transcript", label: "Transcribing" },
  { key: "pauses", label: "Pauses and pitch" },
  { key: "fillers", label: "Fillers and pace" },
  { key: "language", label: "Grammar and vocabulary" },
  { key: "content", label: "What you explained" },
  { key: "score", label: "Scoring" },
];

// What each local stage is doing, and which checkpoint it belongs to.
const LOCAL_STEPS: Record<
  Exclude<AnalysisStage, "reviewing">,
  { doing: string; index: number }
> = {
  downloading: {
    doing: "Downloading the speech model, first time only",
    index: 0,
  },
  measuring: {
    doing: "Measuring silences and how your voice rises and falls",
    index: 1,
  },
  preparing: { doing: "Preparing the audio", index: 0 },
  queued: { doing: "Waiting for another talk to finish", index: 0 },
  scoring: { doing: "Weighing fluency, pace, delivery and language", index: 5 },
  transcribing: { doing: "Turning your talk into text", index: 0 },
};

function percent(fraction: number | null) {
  return fraction === null
    ? ""
    : ` · ${formatPercent(Math.round(fraction * 100))}`;
}

// Which analysis step is running, and what it's doing right now.
function activeStep(progress: AnalysisProgress): {
  doing: string;
  index: number;
} {
  if (progress.stage === "reviewing") {
    // "done" arrives before the result is fetched, so it stays on the content step.
    const index =
      progress.serverStage === "content" || progress.serverStage === "done"
        ? 4
        : 3;
    // Going offline keeps the current step; it doesn't undo finished ones.
    if (progress.isOffline) {
      return {
        doing: "Waiting for a connection. It carries on by itself.",
        index,
      };
    }
    return index === 4
      ? { doing: "Checking what you explained against the topic", index }
      : { doing: "Reading every sentence for mistakes", index };
  }

  const { doing, index } = LOCAL_STEPS[progress.stage];
  return { doing: doing + percent(progress.fraction), index };
}

// The analysis checkpoints for live progress. `lead` steps (e.g. saving the
// recording) come first and are already done.
export function stepsFor(progress: AnalysisProgress, lead: Step[] = []) {
  const { doing, index } = activeStep(progress);
  const isDone = progress.findings.score !== undefined;
  const steps = ANALYSIS_STEPS.map(({ key, label }, at) => ({
    doing: at === index ? doing : "",
    done: progress.findings[key] ?? "",
    label,
  }));

  return {
    active: lead.length + (isDone ? steps.length : index),
    isDone,
    steps: [...lead, ...steps],
  };
}

function StepIcon({
  isActive,
  isComplete,
  isFailed,
}: {
  isActive: boolean;
  isComplete: boolean;
  isFailed: boolean;
}) {
  if (isComplete) {
    return (
      <IconCircleCheckFilled className="size-5 animate-in text-primary duration-300 zoom-in-50 motion-reduce:animate-none" />
    );
  }
  if (isFailed) {
    return <IconAlertCircleFilled className="size-5 text-destructive" />;
  }
  if (isActive) {
    return (
      <span className="text-primary">
        <Spinner className="size-4" />
      </span>
    );
  }
  return <span className="size-2 rounded-full bg-border dark:bg-input" />;
}

// Chain of checkpoints on one connector line: done steps show what they
// found, the active one shimmers with what it's doing (or turns red with the
// error), upcoming ones are muted. Every row keeps its height, so nothing
// shifts as steps complete.
export function AnalysisSteps({
  active,
  error = null,
  steps,
}: {
  active: number;
  error?: string | null;
  steps: Step[];
}) {
  return (
    <ol className="flex flex-col text-left">
      {steps.map((item, index) => {
        const isComplete = index < active;
        const isActive = index === active;
        const isFailed = isActive && error !== null;
        const isLast = index === steps.length - 1;

        return (
          <li
            aria-current={isActive ? "step" : undefined}
            className="flex gap-3"
            key={item.label}
          >
            <div className="flex w-5 shrink-0 flex-col items-center">
              <span className="flex size-5 shrink-0 items-center justify-center">
                <StepIcon
                  isActive={isActive}
                  isComplete={isComplete}
                  isFailed={isFailed}
                />
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
              className={cn("flex min-w-0 flex-col gap-0.5", !isLast && "pb-4")}
            >
              <span
                className={cn(
                  "text-sm leading-5 font-medium",
                  isActive && !isFailed && "text-shimmer",
                  !isComplete && !isActive && "text-muted-foreground/60"
                )}
              >
                {item.label}
              </span>
              <span
                className={cn(
                  "min-h-5 text-sm",
                  isFailed ? "text-destructive" : "text-muted-foreground",
                  (isComplete || isActive) &&
                    "animate-in duration-300 fade-in-0 slide-in-from-top-1 motion-reduce:animate-none"
                )}
                key={isComplete ? "done" : "doing"}
              >
                {isComplete && item.done}
                {isActive && (isFailed ? error : item.doing)}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
