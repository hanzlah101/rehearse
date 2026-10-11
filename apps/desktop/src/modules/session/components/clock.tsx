import { formatDuration } from "@/lib/format";

// "2:41 / 7:00": the live value large, its reference small, on one baseline.
export function Clock({ seconds, total }: { seconds: number; total: number }) {
  return (
    <p className="flex items-baseline gap-2 font-heading tabular-nums">
      <span className="text-4xl font-semibold">{formatDuration(seconds)}</span>
      <span className="text-lg text-muted-foreground">
        / {formatDuration(total)}
      </span>
    </p>
  );
}
