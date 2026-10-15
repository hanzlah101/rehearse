import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouter } from "@server/router";

import { getToken } from "@/modules/auth/lib/token";
import { env } from "@/modules/common/lib/env";

const link = new RPCLink({
  // The session travels as a bearer token from the OS credential store, not
  // the cookie (cross-site in the installed app); see modules/auth/lib/token.ts.
  fetch: async (url, init) => {
    const headers = new Headers(init?.headers);
    const token = await getToken();
    if (token !== null) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return await fetch(url, { ...init, credentials: "omit", headers });
  },
  origin: env.VITE_API_URL,
  url: "/api/rpc",
});

export const api: RouterClient<AppRouter> = createORPCClient(link);

export const orpc = createTanstackQueryUtils(api);
