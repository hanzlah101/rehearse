import { createFileRoute } from "@tanstack/react-router";

import { AppLayout } from "@/modules/common/components/app-layout";
import { requireMicrophone } from "@/modules/onboarding/lib/microphone";

export const Route = createFileRoute("/(private)/(app)")({
  beforeLoad: requireMicrophone,
  component: AppLayout,
});
