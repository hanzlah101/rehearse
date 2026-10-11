import { createFileRoute } from "@tanstack/react-router";

import { requireGuest } from "@/modules/auth/lib/guards";

export const Route = createFileRoute("/(auth)")({
  beforeLoad: requireGuest,
});
