import {
  IconAlertCircleFilled,
  IconReload,
  IconScissors,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  AnalysisSteps,
  stepsFor,
} from "@/modules/analysis/components/analysis-steps";
import { retryAnalysis } from "@/modules/analysis/lib/runner";
import { useAnalysis } from "@/modules/analysis/lib/use-analysis";
import type { Attempt } from "@/modules/history/lib/rehearsals";
import { MIN_SPOKEN_SECONDS } from "@/modules/history/lib/rehearsals";

function Note({
  action,
  description,
  icon: Icon,
  title,
}: {
  action?: React.ReactNode;
  description: string;
  icon: typeof IconAlertCircleFilled;
  title: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-pretty text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

function RetryButton({
  attemptId,
  label,
}: {
  attemptId: string;
  label: string;
}) {
  return (
    <Button
      onPress={() => {
        void retryAnalysis(attemptId);
      }}
      variant="outline"
    >
      <IconReload data-icon="inline-start" />
      {label}
    </Button>
  );
}

const WAITING = {
  error: null,
  findings: {},
  fraction: null,
  isOffline: false,
  serverStage: null,
  stage: "queued",
} as const;

// An attempt without feedback yet: its live analysis, why it stopped, or an
// offer to analyse a talk that was cut short.
export function AttemptAnalysis({ attempt }: { attempt: Attempt }) {
  const analysis = useAnalysis(attempt.id);
  const canAnalyse = attempt.spokenSeconds >= MIN_SPOKEN_SECONDS;

  if (attempt.status === "failed") {
    return (
      <Note
        action={
          canAnalyse && <RetryButton attemptId={attempt.id} label="Try again" />
        }
        description={
          attempt.error ??
          "Something went wrong while analysing it. The recording is still saved."
        }
        icon={IconAlertCircleFilled}
        title="Analysis stopped"
      />
    );
  }

  if (attempt.status === "interrupted") {
    return (
      <Note
        action={
          canAnalyse && (
            <RetryButton attemptId={attempt.id} label="Analyse it" />
          )
        }
        description="Rehearse closed during this talk. Everything said up to then is saved."
        icon={IconScissors}
        title="This talk was cut short"
      />
    );
  }

  const { active, steps } = stepsFor(analysis ?? WAITING);

  return (
    <section
      aria-label="Analysis"
      className="flex flex-col gap-5 rounded-2xl border border-dashed p-5"
    >
      <div className="flex flex-col gap-0.5">
        <p aria-live="polite" className="font-medium">
          {analysis?.error === null || analysis === null
            ? "Analysing this attempt"
            : "Analysis stopped"}
        </p>
        <p className="text-sm text-pretty text-muted-foreground">
          Runs in the background; you can keep using Rehearse.
        </p>
      </div>
      <AnalysisSteps
        active={active}
        error={analysis?.error ?? null}
        steps={steps}
      />
    </section>
  );
}
