import { IconAlertCircleFilled } from "@tabler/icons-react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { formatDateTime, formatNumber, formatPercent } from "@/lib/format";
import type { Attempt } from "@/modules/history/lib/rehearsals";

// One line for the trigger: "Attempt 2 · 35%".
function summaryOf(attempt: Attempt) {
  const name = `Attempt ${formatNumber(attempt.n)}`;
  return attempt.score === null
    ? name
    : `${name} · ${formatPercent(attempt.score)}`;
}

// The attempt's score, or what its analysis is doing.
function AttemptState({ attempt }: { attempt: Attempt }) {
  if (attempt.score !== null) {
    return (
      <span className="font-heading font-semibold tabular-nums">
        {formatPercent(attempt.score)}
      </span>
    );
  }
  if (attempt.status === "processing") {
    return (
      <span className="text-muted-foreground">
        <Spinner className="size-3.5" />
      </span>
    );
  }
  return (
    <IconAlertCircleFilled
      aria-hidden="true"
      className="size-4 text-muted-foreground"
    />
  );
}

// Picks an attempt from the page toolbar: newest first, each with when it
// was recorded and its score (or analysis state).
export function AttemptSwitcher({
  attempts,
  onSelect,
  selected,
}: {
  attempts: Attempt[];
  onSelect: (n: number) => void;
  selected: number;
}) {
  return (
    <Select
      className="w-52"
      onChange={(key) => {
        if (typeof key === "number") {
          onSelect(key);
        }
      }}
      value={selected}
    >
      <Label className="sr-only">Attempt</Label>
      <SelectTrigger size="sm" />
      <SelectContent className="min-w-64">
        {attempts.toReversed().map((attempt) => (
          <SelectItem
            id={attempt.n}
            key={attempt.n}
            textValue={summaryOf(attempt)}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">
                  Attempt {formatNumber(attempt.n)}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {formatDateTime(attempt.createdAt)}
                </span>
              </span>
              <AttemptState attempt={attempt} />
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
