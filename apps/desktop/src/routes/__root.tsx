import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import { Toaster } from "@/components/ui/sonner";
import { sessionQueryOptions } from "@/modules/auth/queries/session";
import { ErrorPage } from "@/modules/common/pages/error-page";

export type RouterContext = {
  queryClient: QueryClient;
};

function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context }) => ({
    session: await context.queryClient.query(sessionQueryOptions),
  }),
  component: RootLayout,
  errorComponent: ErrorPage,
});
