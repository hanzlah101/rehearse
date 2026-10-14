import { orpc } from "@/modules/common/lib/orpc";

// Speaking time sent for review in the last 24 hours, against the student's
// daily limit. Refetched after every submission (runner) and, once the limit
// is used up, again when the window frees time.
export const usageQueryOptions = orpc.feedback.usage.queryOptions({
  refetchInterval: (query) => {
    const refreshesAt = query.state.data?.refreshesAt;
    return refreshesAt === undefined || refreshesAt === null
      ? false
      : Math.max(refreshesAt.getTime() - Date.now(), 1000);
  },
});
