import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import { Toaster } from "@/components/ui/sonner";
import { sessionQueryOptions } from "@/modules/auth/queries/session";
import { UpdateChecker } from "@/modules/common/components/update-checker";
import { openDatabase } from "@/modules/common/db/init";
import { ErrorPage } from "@/modules/common/pages/error-page";
import { SplashPage } from "@/modules/common/pages/splash-page";

export type RouterContext = {
  queryClient: QueryClient;
};

function RootLayout() {
  return (
    <>
      <div className="flex h-svh flex-col">
        <Outlet />
      </div>
      <Toaster />
      <UpdateChecker />
    </>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  // The session (server) and the local database open in parallel.
  beforeLoad: async ({ context }) => {
    const [session] = await Promise.all([
      context.queryClient.query(sessionQueryOptions),
      openDatabase(),
    ]);
    return { session };
  },
  component: RootLayout,
  errorComponent: ErrorPage,
  pendingComponent: SplashPage,
  // Show the splash at once instead of a blank window for the default 1s;
  // the default pendingMinMs (500) keeps it from flickering on fast loads.
  pendingMs: 0,
});
