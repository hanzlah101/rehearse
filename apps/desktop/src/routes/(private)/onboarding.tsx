import { createFileRoute, redirect } from "@tanstack/react-router";

import { getMicrophoneAccess } from "@/modules/onboarding/lib/microphone";
import { OnboardingPage } from "@/modules/onboarding/pages/onboarding-page";

export const Route = createFileRoute("/(private)/onboarding")({
  // Already allowed: nothing to set up.
  beforeLoad: async () => {
    if ((await getMicrophoneAccess()) === "granted") {
      throw redirect({ replace: true, to: "/" });
    }
  },
  component: OnboardingPage,
});
