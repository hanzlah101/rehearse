import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "cn";

import { Skeleton } from "@/components/ui/skeleton";
import { formatDelta, formatNumber, formatPercent } from "@/lib/format";
import { useSession } from "@/modules/auth/queries/session";
import { progressQueryOptions } from "@/modules/history/queries/rehearsals";

export function ProgressStats() {
  const { student } = useSession();
  const {
    data: { days, lastScore, streak },
  } = useSuspenseQuery(progressQueryOptions(student.id));
  const week = days.map((day, index) => ({
    ...day,
    isToday: index === days.length - 1,
  }));

  return (
    <dl className="grid grid-cols-2 gap-8 border-t pt-8">
      <div className="flex flex-col gap-3">
        <dt className="text-sm text-muted-foreground">Streak</dt>
        <dd className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <span className="font-heading text-3xl font-semibold tabular-nums">
            {formatNumber(streak)} {streak === 1 ? "day" : "days"}
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
            {lastScore === null ? "–" : formatPercent(lastScore.score)}
          </span>
          {lastScore !== null && lastScore.delta !== null && (
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground tabular-nums">
                {formatDelta(lastScore.delta)}
              </span>{" "}
              since your last attempt
            </span>
          )}
        </dd>
      </div>
    </dl>
  );
}

export function ProgressStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-8 border-t pt-8">
      {["Streak", "Last score"].map((label) => (
        <div className="flex flex-col gap-3" key={label}>
          <p className="text-sm text-muted-foreground">{label}</p>
          <Skeleton className="h-9 w-28" />
        </div>
      ))}
    </div>
  );
}
