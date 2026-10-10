import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import { createRouterClient } from "@orpc/server";
import type { RouterClient } from "@orpc/server";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { router } from "@/server/router";
import type { AppRouter } from "@/server/router";

const getClient = createIsomorphicFn()
  .server(() =>
    createRouterClient(router, {
      context: () => ({ headers: getRequestHeaders() }),
    })
  )
  .client((): RouterClient<AppRouter> => {
    const link = new RPCLink({
      plugins: [
        new BatchLinkPlugin({
          groups: [{ condition: () => true, context: {} }],
        }),
      ],
      url: "/api/rpc",
    });

    return createORPCClient(link);
  });

export const client: RouterClient<AppRouter> = getClient();
