import { createFileRoute } from "@tanstack/react-router";

import { SettingsPage } from "@/modules/settings/pages/settings-page";

export const Route = createFileRoute("/(private)/(app)/settings")({
  component: SettingsPage,
});
