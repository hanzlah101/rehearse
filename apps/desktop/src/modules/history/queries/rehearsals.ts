import { queryOptions } from "@tanstack/react-query";

import {
  getProgress,
  getRehearsal,
  listRehearsals,
} from "@/modules/history/lib/rehearsals";

// Local data only changes through this app, so it never goes stale on its
// own: writes invalidate LOCAL_QUERY_KEY instead.
export const LOCAL_QUERY_KEY = ["local"] as const;

export function rehearsalsQueryOptions(studentId: string) {
  return queryOptions({
    queryFn: async () => await listRehearsals(studentId),
    queryKey: [...LOCAL_QUERY_KEY, "rehearsals", studentId],
    staleTime: "static",
  });
}

export function rehearsalQueryOptions(studentId: string, id: string) {
  return queryOptions({
    queryFn: async () => await getRehearsal(studentId, id),
    queryKey: [...LOCAL_QUERY_KEY, "rehearsal", studentId, id],
    staleTime: "static",
  });
}

export function progressQueryOptions(studentId: string) {
  return queryOptions({
    queryFn: async () => await getProgress(studentId),
    queryKey: [...LOCAL_QUERY_KEY, "progress", studentId],
    staleTime: "static",
  });
}
