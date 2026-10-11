import { createFileRoute } from "@tanstack/react-router";

import { NewRehearsalPage } from "@/modules/rehearsal/pages/new-rehearsal-page";

export const Route = createFileRoute("/(private)/(app)/")({
  component: NewRehearsalPage,
});
