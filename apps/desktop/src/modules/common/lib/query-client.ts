import { QueryClient } from "@tanstack/react-query";

import { isUnauthorized } from "@/modules/common/lib/errors";

const MAX_QUERY_RETRIES = 3;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // A 401 won't fix itself; retrying only delays the error.
        retry: (failureCount, error) =>
          !isUnauthorized(error) && failureCount < MAX_QUERY_RETRIES,
      },
    },
  });
}
