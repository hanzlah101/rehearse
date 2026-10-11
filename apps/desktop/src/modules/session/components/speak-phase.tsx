import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
  IconX,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { Clock } from "@/modules/session/components/clock";

// Talks under this many seconds aren't analysed, so Finish waits (PLAN §2.4).
const MIN_SECONDS = 30;

function hintFor(isPaused: boolean, canFinish: boolean) {
  if (isPaused) {
    return "Paused. Paused time doesn’t count.";
  }

  return canFinish
    ? "Speak from your own head. Finish whenever you’re done."
    : `Keep going: you can finish after ${formatNumber(MIN_SECONDS)} seconds.`;
}

export function SpeakPhase({
  elapsed,
  isPaused,
  onCancel,
  onFinish,
  onPausedChange,
  target,
}: {
  elapsed: number;
  isPaused: boolean;
  onCancel: () => void;
  onFinish: () => void;
  onPausedChange: (isPaused: boolean) => void;
  target: number;
}) {
  const canFinish = elapsed >= MIN_SECONDS;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <Clock seconds={elapsed} total={target} />
        <p className="text-sm text-muted-foreground">
          {hintFor(isPaused, canFinish)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button onPress={onCancel} size="lg" variant="destructive-muted">
          <IconX data-icon="inline-start" />
          Cancel
        </Button>
        <Button
          onPress={() => {
            onPausedChange(!isPaused);
          }}
          size="lg"
          variant="outline"
        >
          {isPaused ? (
            <IconPlayerPlayFilled data-icon="inline-start" />
          ) : (
            <IconPlayerPauseFilled data-icon="inline-start" />
          )}
          {isPaused ? "Resume" : "Pause"}
        </Button>
        <Button isDisabled={!canFinish} onPress={onFinish} size="lg">
          <IconPlayerStopFilled data-icon="inline-start" />
          Finish
        </Button>
      </div>
    </div>
  );
}
