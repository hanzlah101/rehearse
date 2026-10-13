import { useSyncExternalStore } from "react";

import {
  getAnalysis,
  subscribeToAnalyses,
} from "@/modules/analysis/lib/runner";

// Live progress of one attempt's analysis; null when it isn't running.
export function useAnalysis(attemptId: string | null) {
  return useSyncExternalStore(subscribeToAnalyses, () =>
    attemptId === null ? null : getAnalysis(attemptId)
  );
}
