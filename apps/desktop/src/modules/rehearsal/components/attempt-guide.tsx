import {
  IconCircleCheckFilled,
  IconCircleDashed,
  IconCircleHalf2,
} from "@tabler/icons-react";
import { useId } from "react";

import { Meter } from "@/components/ui/meter";
import {
  formatDelta,
  formatDuration,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import type { Attempt, KeyPointDepth } from "@/modules/history/lib/rehearsals";
import {
  AnnotatedTranscript,
  BetterVersion,
} from "@/modules/rehearsal/components/annotated-transcript";
import { RecordingPlayer } from "@/modules/rehearsal/components/recording-player";
import {
  parseTranscript,
  transcriptStats,
} from "@/modules/rehearsal/lib/transcript";

const DEPTHS: Record<
  KeyPointDepth,
  { icon: typeof IconCircleCheckFilled; label: string; tone: string }
> = {
  brief: { icon: IconCircleHalf2, label: "Brief", tone: "text-primary" },
  good: {
    icon: IconCircleCheckFilled,
    label: "Covered well",
    tone: "text-primary",
  },
  missed: {
    icon: IconCircleDashed,
    label: "Missed",
    tone: "text-muted-foreground",
  },
};

function statsOf(attempt: Attempt) {
  return {
    ...transcriptStats(parseTranscript(attempt.transcript)),
    wpm: attempt.wpm,
  };
}

// One attempt's guide: what it scored, how it moved since the attempt before,
// what was said with every finding in place, and a better version to aim for.
export function AttemptGuide({
  attempt,
  minutes,
  previous,
}: {
  attempt: Attempt;
  minutes: number;
  previous: Attempt | undefined;
}) {
  const titleId = useId();
  const paragraphs = parseTranscript(attempt.transcript);
  const current = statsOf(attempt);
  const before = previous === undefined ? undefined : statsOf(previous);
  // Value and unit render apart, so units sit small after the number (" wpm"
  // keeps its space, "s" hugs the number).
  const stats = [
    { label: "Fillers", previous: before?.fillers, value: current.fillers },
    {
      label: "Repeated phrases",
      previous: before?.repeated,
      value: current.repeated,
    },
    {
      label: "Longest pause",
      previous: before?.longestPause,
      unit: "s",
      value: current.longestPause,
    },
    { label: "Pace", previous: before?.wpm, unit: " wpm", value: current.wpm },
  ];

  return (
    <section
      aria-labelledby={titleId}
      className="flex animate-in flex-col gap-12 duration-300 fade-in-0 motion-reduce:animate-none"
    >
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-2xl font-semibold">
              Attempt {attempt.n}
            </h2>
            <p className="text-sm text-muted-foreground">
              {attempt.date}. Spoke {formatDuration(attempt.spokenSeconds)} of{" "}
              {formatDuration(minutes * 60)}.
            </p>
          </div>
          <p className="flex items-baseline gap-3">
            <span className="font-heading text-6xl leading-none font-semibold tabular-nums">
              {formatPercent(attempt.score)}
            </span>
            {previous !== undefined && (
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-primary tabular-nums">
                  {formatDelta(attempt.score - previous.score)}
                </span>{" "}
                since attempt {previous.n}
              </span>
            )}
          </p>
        </div>

        {/* Three fixed rows per stat (label, value, previous) so every column
            lines up at any width. */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 border-y py-6 sm:grid-cols-4">
          {stats.map((stat) => (
            <div className="flex min-w-0 flex-col" key={stat.label}>
              <dt className="truncate text-sm text-muted-foreground">
                {stat.label}
              </dt>
              <dd className="mt-1.5 font-heading text-2xl leading-8 font-semibold tabular-nums">
                {formatNumber(stat.value, { maximumFractionDigits: 1 })}
                {stat.unit !== undefined && (
                  <span className="text-sm font-medium whitespace-pre text-muted-foreground">
                    {stat.unit}
                  </span>
                )}
              </dd>
              {stat.previous !== undefined && (
                <dd className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  was{" "}
                  {formatNumber(stat.previous, { maximumFractionDigits: 1 })}
                  {stat.unit}
                </dd>
              )}
            </div>
          ))}
        </dl>
      </div>

      <RecordingPlayer src={attempt.recording} />

      <AnnotatedTranscript paragraphs={paragraphs} />

      <div className="grid gap-12 md:grid-cols-2">
        <div className="flex flex-col gap-5">
          <h3 className="text-lg font-semibold">Subscores</h3>
          <div className="flex flex-col gap-4">
            {attempt.subscores.map((subscore) => (
              <Meter
                key={subscore.name}
                label={subscore.name}
                value={subscore.value}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold">Key points</h3>
            <p className="text-sm text-pretty text-muted-foreground">
              Revealed after you speak. Add the missed ones next time.
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {attempt.keyPoints.map(({ depth, point }) => {
              const { icon: Icon, label, tone } = DEPTHS[depth];

              return (
                <li className="flex items-center gap-3 text-sm" key={point}>
                  <Icon className={`size-4 shrink-0 ${tone}`} />
                  <span className="min-w-0 flex-1">{point}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <BetterVersion paragraphs={parseTranscript(attempt.better)} />
    </section>
  );
}
