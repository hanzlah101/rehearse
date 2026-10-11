import { cn } from "cn";

import { formatDelta, formatNumber, formatPercent } from "@/lib/format";
import {
  REHEARSAL_GROUPS,
  PRACTICE_DAYS,
  STREAK_DAYS,
} from "@/modules/history/lib/rehearsals";

// The latest attempt overall, against the attempt before it on that topic.
const recent = REHEARSAL_GROUPS.at(0)?.rehearsals.at(0);
const previous = recent?.attempts.at(-2);

// PRACTICE_DAYS ends today.
const week = PRACTICE_DAYS.map((practised, index) => {
  const date = new Date();
  date.setDate(date.getDate() - (PRACTICE_DAYS.length - 1 - index));

  return { date, isToday: index === PRACTICE_DAYS.length - 1, practised };
});

export function ProgressStats() {
  return (
    <dl className="grid grid-cols-2 gap-8 border-t pt-8">
      <div className="flex flex-col gap-3">
        <dt className="text-sm text-muted-foreground">Streak</dt>
        <dd className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <span className="font-heading text-3xl font-semibold tabular-nums">
            {formatNumber(STREAK_DAYS)} days
          </span>
          <ol aria-label="Last 7 days" className="flex gap-2">
            {week.map(({ date, isToday, practised }) => (
              <li
                aria-label={`${date.toLocaleDateString(undefined, { weekday: "long" })}: ${practised ? "rehearsed" : "no rehearsal"}`}
                className="flex flex-col items-center gap-1.5"
                key={date.toDateString()}
              >
                <span
                  className={cn(
                    "size-2.5 rounded-full",
                    practised && "bg-primary",
                    !practised && !isToday && "bg-border dark:bg-input",
                    !practised && isToday && "ring-1 ring-primary ring-inset"
                  )}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "text-xs text-muted-foreground",
                    isToday && "font-semibold text-foreground"
                  )}
                >
                  {date.toLocaleDateString(undefined, { weekday: "narrow" })}
                </span>
              </li>
            ))}
          </ol>
        </dd>
      </div>

      <div className="flex flex-col gap-3">
        <dt className="text-sm text-muted-foreground">Last score</dt>
        <dd className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-heading text-3xl font-semibold tabular-nums">
            {recent === undefined ? "–" : formatPercent(recent.latest.score)}
          </span>
          {recent !== undefined && previous !== undefined && (
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground tabular-nums">
                {formatDelta(recent.latest.score - previous.score)}
              </span>{" "}
              since your last attempt
            </span>
          )}
        </dd>
      </div>
    </dl>
  );
}
