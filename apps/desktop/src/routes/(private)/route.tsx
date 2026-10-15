import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AnalysisRunner } from "@/modules/analysis/components/analysis-runner";
import { requireSession } from "@/modules/auth/lib/guards";
import { useSessionCheck } from "@/modules/auth/queries/session";

function PrivateLayout() {
  useSessionCheck();

  return (
    <>
      <AnalysisRunner />
      <Outlet />
    </>
  );
}

// Logged-in only. (app) adds the sidebar shell; session is full-screen. The
// background analysis runs for as long as someone is logged in.
export const Route = createFileRoute("/(private)")({
  beforeLoad: requireSession,
  component: PrivateLayout,
});
