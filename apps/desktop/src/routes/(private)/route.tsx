import { createFileRoute } from "@tanstack/react-router";

import { requireSession } from "@/modules/auth/lib/guards";

// Logged-in only. (app) adds the sidebar shell; session is full-screen.
export const Route = createFileRoute("/(private)")({
  beforeLoad: requireSession,
});
