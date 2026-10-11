import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouter } from "@server/router";

import { env } from "@/modules/common/lib/env";

const link = new RPCLink({
  // Send the session cookie to the API origin.
  fetch: async (url, init) =>
    await fetch(url, { ...init, credentials: "include" }),
  origin: env.VITE_API_URL,
  url: "/api/rpc",
});

export const api: RouterClient<AppRouter> = createORPCClient(link);

export const orpc = createTanstackQueryUtils(api);
