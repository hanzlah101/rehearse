import {
  IconCircleCheckFilled,
  IconLockFilled,
  IconMicrophoneFilled,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import logo from "@/assets/logo.svg";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  MICROPHONE_SETTINGS_URL,
  openMicrophoneSettings,
  requestMicrophone,
} from "@/modules/onboarding/lib/microphone";
import type { MicrophoneRequest } from "@/modules/onboarding/lib/microphone";

// Pause on the granted state so the change registers before moving on.
const GRANTED_PAUSE_MS = 700;

// Shown until the mic is allowed (requireMicrophone sends recording screens
// here). One action; if the OS blocks the mic, how to turn it back on.
export function OnboardingPage() {
  const navigate = useNavigate();
  const [isRequesting, setIsRequesting] = useState(false);
  const [result, setResult] = useState<MicrophoneRequest | null>(null);

  async function allow() {
    setIsRequesting(true);
    const next = await requestMicrophone();
    setResult(next);
    setIsRequesting(false);

    if (next === "granted") {
      setTimeout(() => {
        void navigate({ replace: true, to: "/" });
      }, GRANTED_PAUSE_MS);
    }
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div data-tauri-drag-region className="h-12 shrink-0" />

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-10 px-8 pb-16">
        <div className="flex flex-col gap-6">
          <img src={logo} alt="" className="size-14" />
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl leading-tight font-semibold text-balance">
              Rehearse needs to hear you
            </h1>
            <p className="text-lg text-pretty text-muted-foreground">
              Allow the microphone so Rehearse can record your talks and coach
              you on fillers, pauses, pace and grammar.
            </p>
          </div>
          <p className="flex items-start gap-2.5 text-sm text-pretty text-muted-foreground">
            <IconLockFilled className="mt-0.5 size-4 shrink-0" />
            Recordings stay on this computer. Only text is ever sent for
            feedback.
          </p>
        </div>

        {result === "denied" && (
          <Alert variant="destructive">
            <AlertTitle>The microphone is turned off for Rehearse</AlertTitle>
            <AlertDescription>
              {MICROPHONE_SETTINGS_URL === undefined
                ? "Allow microphone access for Rehearse in your system settings, then try again."
                : "Turn on Rehearse under Microphone in your system settings, then try again. You may need to reopen the app."}
            </AlertDescription>
          </Alert>
        )}
        {result === "no-device" && (
          <Alert variant="destructive">
            <AlertTitle>No microphone found</AlertTitle>
            <AlertDescription>
              Connect a microphone or headset, then try again.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {result === "granted" ? (
            <p
              aria-live="polite"
              className="flex h-10 animate-in items-center gap-2 font-medium text-primary duration-300 fade-in-0 zoom-in-95 motion-reduce:animate-none"
            >
              <IconCircleCheckFilled className="size-5" />
              Microphone ready
            </p>
          ) : (
            <Button
              isLoading={isRequesting}
              onPress={() => {
                void allow();
              }}
              size="lg"
            >
              <IconMicrophoneFilled data-icon="inline-start" />
              {result === null ? "Allow microphone" : "Try again"}
            </Button>
          )}
          {result === "denied" && MICROPHONE_SETTINGS_URL !== undefined && (
            <Button
              onPress={() => {
                void openMicrophoneSettings();
              }}
              size="lg"
              variant="muted"
            >
              Open system settings
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
