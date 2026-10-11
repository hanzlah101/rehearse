import { orpc } from "@/modules/common/lib/orpc";

// Topics the student can speak about: their own (newest first), then the
// shared ones. Loaded by the home route before it renders.
export const topicsQueryOptions = orpc.topics.list.queryOptions();
