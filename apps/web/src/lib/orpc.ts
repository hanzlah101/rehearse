import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import { createRouterClient } from "@orpc/server";
import type { RouterClient } from "@orpc/server";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders, getRequestIP } from "@tanstack/react-start/server";

import { router } from "@/server/router";
import type { AppRouter } from "@/server/router";

export const api = createIsomorphicFn()
  .server(() =>
    createRouterClient(router, {
      context: () => ({
        clientIp: getRequestIP({ xForwardedFor: true }) ?? null,
        headers: getRequestHeaders(),
      }),
    })
  )
  .client(() => {
    const link = new RPCLink({
      plugins: [
        new BatchLinkPlugin({
          groups: [{ condition: () => true, context: {} }],
        }),
      ],
      url: "/api/rpc",
    });

    return createORPCClient<RouterClient<AppRouter>>(link);
  })();
