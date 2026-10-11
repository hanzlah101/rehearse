import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/modules/home/pages/home-page";

export const Route = createFileRoute("/(private)/")({
  component: HomePage,
});
