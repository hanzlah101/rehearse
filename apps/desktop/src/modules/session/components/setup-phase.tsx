import {
  IconArrowLeft,
  IconMicrophoneFilled,
  IconPlayerRecordFilled,
} from "@tabler/icons-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/format";
import {
  MICROPHONE_SETTINGS_URL,
  openMicrophoneSettings,
} from "@/modules/onboarding/lib/microphone";
import type { MicrophoneProblem } from "@/modules/session/lib/use-microphone";

const PROBLEMS: Record<MicrophoneProblem, string> = {
  denied: "Rehearse isn’t allowed to use your microphone.",
  "no-device": "No microphone found. Plug one in to start.",
  unavailable: "Couldn’t open this microphone. Another app may be using it.",
};

function hintFor(problem: MicrophoneProblem | null, isReady: boolean) {
  if (problem !== null) {
    return PROBLEMS[problem];
  }

  return isReady
    ? "Say a few words: the orb follows your voice."
    : "Connecting to your microphone…";
}

// Before the talk: pick the input and check it reacts, then start.
export function SetupPhase({
  deviceId,
  devices,
  isReady,
  isStarting,
  onBack,
  onDeviceChange,
  onStart,
  problem,
}: {
  deviceId: string | null;
  devices: MediaDeviceInfo[];
  isReady: boolean;
  isStarting: boolean;
  onBack: () => void;
  onDeviceChange: (deviceId: string) => void;
  onStart: () => void;
  problem: MicrophoneProblem | null;
}) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <div className="flex w-full flex-col gap-2">
        <Select
          className="w-full"
          isDisabled={devices.length === 0 || isStarting}
          onChange={(key) => {
            if (typeof key === "string") {
              onDeviceChange(key);
            }
          }}
          placeholder="Choose a microphone"
          value={deviceId}
        >
          <Label className="sr-only">Microphone</Label>
          <SelectTrigger>
            <IconMicrophoneFilled className="text-muted-foreground" />
          </SelectTrigger>
          <SelectContent>
            {devices.map((device, index) => (
              <SelectItem id={device.deviceId} key={device.deviceId}>
                {device.label === ""
                  ? `Microphone ${formatNumber(index + 1)}`
                  : device.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p
          aria-live="polite"
          className={cn(
            "text-sm",
            problem === null ? "text-muted-foreground" : "text-destructive"
          )}
        >
          {hintFor(problem, isReady)}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button onPress={onBack} size="lg" variant="outline">
          <IconArrowLeft data-icon="inline-start" />
          Back
        </Button>
        {problem === "denied" && MICROPHONE_SETTINGS_URL !== undefined ? (
          <Button
            onPress={() => {
              void openMicrophoneSettings();
            }}
            size="lg"
          >
            Open settings
          </Button>
        ) : (
          <Button
            isDisabled={!isReady}
            isLoading={isStarting}
            onPress={onStart}
            size="lg"
          >
            <IconPlayerRecordFilled data-icon="inline-start" />
            Start talking
          </Button>
        )}
      </div>
    </div>
  );
}
