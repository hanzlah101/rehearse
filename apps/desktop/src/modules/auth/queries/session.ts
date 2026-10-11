import { safe } from "@orpc/client";
import { queryOptions } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { isUnauthorized } from "@/modules/common/lib/errors";
import { api } from "@/modules/common/lib/orpc";

export const sessionQueryOptions = queryOptions({
  queryFn: async () => {
    const { data, error } = await safe(api.auth.session());

    if (error === null) {
      return data;
    }

    // Logged out is a normal state here, not an error.
    if (isUnauthorized(error)) {
      return null;
    }

    throw error;
  },
  queryKey: ["auth", "session"],
  staleTime: "static",
});

const privateRoute = getRouteApi("/(private)");

// Current session inside the (private) group; never null there.
export function useSession() {
  return privateRoute.useRouteContext({ select: (context) => context.session });
}
