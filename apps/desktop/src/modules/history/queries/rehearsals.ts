import { queryOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import type { AttemptRow } from "@/modules/common/db/schema";
import {
  getProgress,
  getRehearsal,
  listRehearsals,
} from "@/modules/history/lib/rehearsals";

// Local data only changes through this app, so it never goes stale on its
// own: writes invalidate LOCAL_QUERY_KEY instead. Infinity, not "static":
// TanStack Query never refetches static queries, even when invalidated.
export const LOCAL_QUERY_KEY = ["local"] as const;

export function rehearsalsQueryOptions(studentId: string) {
  return queryOptions({
    queryFn: async () => await listRehearsals(studentId),
    queryKey: [...LOCAL_QUERY_KEY, "rehearsals", studentId],
    staleTime: Infinity,
  });
}

export function rehearsalQueryOptions(studentId: string, id: string) {
  return queryOptions({
    queryFn: async () => await getRehearsal(studentId, id),
    queryKey: [...LOCAL_QUERY_KEY, "rehearsal", studentId, id],
    staleTime: Infinity,
  });
}

export function progressQueryOptions(studentId: string) {
  return queryOptions({
    queryFn: async () => await getProgress(studentId),
    queryKey: [...LOCAL_QUERY_KEY, "progress", studentId],
    staleTime: Infinity,
  });
}

type AttemptChange = Partial<
  Pick<AttemptRow, "error" | "feedback" | "score" | "spokenSeconds" | "status">
>;

// Writes an attempt change straight into the cached thread and sidebar row,
// so the UI updates at once; callers invalidate LOCAL_QUERY_KEY after to
// reconcile everything else (progress, ordering).
export function updateCachedAttempt(
  queryClient: QueryClient,
  {
    attemptId,
    rehearsalId,
    studentId,
  }: { attemptId: string; rehearsalId: string; studentId: string },
  change: AttemptChange
) {
  queryClient.setQueryData(
    rehearsalQueryOptions(studentId, rehearsalId).queryKey,
    (rehearsal) => {
      if (rehearsal === null || rehearsal === undefined) {
        return rehearsal;
      }
      const attempts = rehearsal.attempts.map((attempt) =>
        attempt.id === attemptId ? { ...attempt, ...change } : attempt
      );
      return { ...rehearsal, attempts, latest: attempts.at(-1) };
    }
  );

  queryClient.setQueryData(
    rehearsalsQueryOptions(studentId).queryKey,
    (rehearsals) => {
      const latest = queryClient.getQueryData(
        rehearsalQueryOptions(studentId, rehearsalId).queryKey
      )?.latest;
      // Only the newest attempt drives the row's score and status.
      if (rehearsals === undefined || latest?.id !== attemptId) {
        return rehearsals;
      }
      return rehearsals.map((row) =>
        row.id === rehearsalId
          ? {
              ...row,
              latestScore: change.score ?? row.latestScore,
              latestStatus: change.status ?? row.latestStatus,
            }
          : row
      );
    }
  );
}
