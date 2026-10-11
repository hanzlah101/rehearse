import { useEffect, useEffectEvent, useState } from "react";

// Whole seconds counted while `isRunning`; pausing keeps the count. `onLimit`
// fires from the timer itself when the count reaches `limit`.
export function useSeconds(
  isRunning: boolean,
  limit = Infinity,
  onLimit?: () => void
) {
  const [seconds, setSeconds] = useState(0);
  const tick = useEffectEvent(() => {
    const next = seconds + 1;
    setSeconds(next);
    if (next >= limit) {
      onLimit?.();
    }
  });

  useEffect(() => {
    const id = isRunning ? setInterval(tick, 1000) : undefined;
    return () => {
      clearInterval(id);
    };
  }, [isRunning]);

  return seconds;
}
