import { createRouter } from "@tanstack/react-router";

import { rememberSession } from "@/modules/auth/queries/session";
import { createQueryClient } from "@/modules/common/lib/query-client";
import { routeTree } from "@/routeTree.gen";

export const queryClient = createQueryClient();
rememberSession(queryClient);

export const router = createRouter({
  context: { queryClient },
  defaultPreload: "intent",
  routeTree,
});

declare module "@tanstack/react-router" {
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface Register {
    router: typeof router;
  }
}
