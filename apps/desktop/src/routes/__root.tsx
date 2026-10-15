import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import { Toaster } from "@/components/ui/sonner";
import { loadSession } from "@/modules/auth/queries/session";
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
  // The session and the local database open in parallel. A remembered
  // session needs no request, so launch only waits for the database.
  beforeLoad: async ({ context }) => {
    const [session] = await Promise.all([
      loadSession(context.queryClient),
      openDatabase(),
    ]);
    return { session };
  },
  component: RootLayout,
  errorComponent: ErrorPage,
  pendingComponent: SplashPage,
  // Only for slow launches (e.g. the first, which asks the server): a fast one
  // goes straight to the app instead of holding the splash for pendingMinMs.
  pendingMs: 150,
});
