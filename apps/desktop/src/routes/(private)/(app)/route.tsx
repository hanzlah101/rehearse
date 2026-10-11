import { createFileRoute } from "@tanstack/react-router";

import { AppLayout } from "@/modules/common/components/app-layout";

export const Route = createFileRoute("/(private)/(app)")({
  component: AppLayout,
});
