import { createFileRoute } from "@tanstack/react-router";

import { requireSession } from "@/modules/auth/lib/guards";

export const Route = createFileRoute("/(private)")({
  beforeLoad: requireSession,
});
