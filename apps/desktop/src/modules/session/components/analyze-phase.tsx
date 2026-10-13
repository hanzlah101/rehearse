import {
  IconAlertCircleFilled,
  IconArrowRight,
  IconReload,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useEffectEvent } from "react";

import { Button } from "@/components/ui/button";
import { formatDuration, formatNumber } from "@/lib/format";
import {
  AnalysisSteps,
  stepsFor,
} from "@/modules/analysis/components/analysis-steps";
import type { Step } from "@/modules/analysis/components/analysis-steps";
import { retryAnalysis } from "@/modules/analysis/lib/runner";
import type { AnalysisProgress } from "@/modules/analysis/lib/runner";
import { useAnalysis } from "@/modules/analysis/lib/use-analysis";

export type SaveState = "saving" | "saved" | "failed";

// Pause on the finished state before opening the report.
const DONE_MS = 900;

const WAITING: AnalysisProgress = {
  error: null,
  findings: {},
  fraction: null,
  isOffline: false,
  serverStage: null,
  stage: "queued",
};

// After the talk: saving the recording, then the real analysis as it runs
// (transcription, Praat, metrics, the server's review, scoring). It opens the
// report by itself when done; the student can also leave it running in the
// background, and the sidebar keeps showing it.
export function AnalyzePhase({
  attemptId,
  isDiscarding,
  onBackground,
  onDiscard,
  onDone,
  onRetrySave,
  save,
  spokenSeconds,
}: {
  attemptId: string;
  isDiscarding: boolean;
  onBackground: () => void;
  onDiscard: () => void;
  onDone: () => void;
  onRetrySave: () => void;
  save: SaveState;
  spokenSeconds: number;
}) {
  const analysis = useAnalysis(save === "saved" ? attemptId : null);
  const saveStep: Step = {
    doing: "Writing your audio to this computer",
    done: `Saved ${formatDuration(spokenSeconds)} of audio`,
    label: "Saving your recording",
  };
  const live = stepsFor(analysis ?? WAITING, [saveStep]);
  const { active, isDone, steps } =
    save === "saved" ? live : { ...live, active: 0, isDone: false };
  const error = analysis?.error ?? null;
  const finish = useEffectEvent(onDone);

  useEffect(() => {
    const id = isDone ? setTimeout(finish, DONE_MS) : undefined;
    return () => {
      clearTimeout(id);
    };
  }, [isDone]);

  if (save === "failed") {
    return (
      <section
        aria-label="Saving failed"
        className="flex w-full max-w-sm flex-col items-center gap-6"
      >
        <div className="flex flex-col items-center gap-2">
          <IconAlertCircleFilled className="size-6 text-destructive" />
          <p className="font-heading text-xl font-semibold" role="alert">
            Couldn’t save your recording
          </p>
          <p className="text-sm text-balance text-muted-foreground">
            Your talk is still in memory. Try again, or discard it. Check that
            your disk has free space.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            isDisabled={isDiscarding}
            onPress={onDiscard}
            size="lg"
            variant="destructive-muted"
          >
            <IconTrash data-icon="inline-start" />
            Discard
          </Button>
          <Button isDisabled={isDiscarding} onPress={onRetrySave} size="lg">
            <IconReload data-icon="inline-start" />
            Try again
          </Button>
        </div>
      </section>
    );
  }

  let title = "Analysing your talk";
  if (error !== null) {
    title = "Analysis stopped";
  } else if (isDone) {
    title = "Report ready";
  }

  return (
    <section
      aria-label="Analysis"
      className="flex w-full max-w-sm flex-col gap-5 text-left"
    >
      <div className="flex items-baseline justify-between gap-4">
        <p aria-live="polite" className="font-heading text-xl font-semibold">
          {title}
        </p>
        <span className="text-sm text-muted-foreground tabular-nums">
          {isDone
            ? "Opening…"
            : `${formatNumber(Math.min(active, steps.length - 1) + 1)} of ${formatNumber(steps.length)}`}
        </span>
      </div>

      <AnalysisSteps active={active} error={error} steps={steps} />

      {error === null ? (
        !isDone &&
        save === "saved" && (
          <Button
            className="self-center"
            onPress={onBackground}
            variant="ghost"
          >
            Continue in the background
            <IconArrowRight data-icon="inline-end" />
          </Button>
        )
      ) : (
        <div className="flex items-center justify-center gap-3">
          <Button onPress={onBackground} variant="outline">
            Open rehearsal
          </Button>
          <Button
            onPress={() => {
              void retryAnalysis(attemptId);
            }}
          >
            <IconReload data-icon="inline-start" />
            Try again
          </Button>
        </div>
      )}
    </section>
  );
}
