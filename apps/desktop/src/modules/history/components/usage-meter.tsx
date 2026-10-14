import { useQuery } from "@tanstack/react-query";

import { Meter } from "@/components/ui/meter";
import { formatNumber, formatWhen } from "@/lib/format";
import { usageQueryOptions } from "@/modules/history/queries/usage";

// Speaking time sent for review today (the server's rolling 24 hours) against
// the student's daily limit. Hidden until it loads, and while offline.
export function UsageMeter() {
  const { data } = useQuery(usageQueryOptions);

  if (data === undefined) {
    return null;
  }

  const { limitSeconds, refreshesAt, usedSeconds } = data;
  const used = formatNumber(Math.ceil(usedSeconds / 60));
  const limit = formatNumber(limitSeconds / 60, {
    style: "unit",
    unit: "minute",
  });

  return (
    <div className="flex flex-col gap-1.5 px-3 pt-3">
      <Meter
        label="Speaking time today"
        maxValue={Math.max(limitSeconds, 1)}
        value={Math.min(usedSeconds, limitSeconds)}
        valueLabel={`${used} of ${limit}`}
      />
      {refreshesAt !== null && (
        <p className="text-xs text-muted-foreground">
          Limit reached. More time at {formatWhen(refreshesAt)}.
        </p>
      )}
    </div>
  );
}
