import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { OrbState } from "@/components/ui/orb";
import { REHEARSAL_GROUPS } from "@/modules/history/lib/rehearsals";
import { AnalyzePhase } from "@/modules/session/components/analyze-phase";
import { OrbFrame } from "@/modules/session/components/orb-frame";
import { SpeakPhase } from "@/modules/session/components/speak-phase";
import { useSeconds } from "@/modules/session/lib/use-seconds";

const routeApi = getRouteApi("/(private)/session");

// Recording stops by itself this long after the target (PLAN §2.4).
const OVERTIME_SECONDS = 60;

type Phase = "speak" | "analyze";

function orbStateFor(phase: Phase, isPaused: boolean): OrbState {
  if (phase === "analyze") {
    return "thinking";
  }

  return phase === "speak" && !isPaused ? "listening" : "idle";
}

// Full-screen rehearsal: speak (starts right away) → analyse, with one orb that
// changes state instead of remounting, so it flows between phases.
export function SessionPage() {
  const { minutes, rehearsal, topic } = routeApi.useSearch();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("speak");
  const [isPaused, setIsPaused] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const target = minutes * 60;
  // Far past the target the talk ends by itself; the clock also stops while a
  // the discard confirmation is open.
  const spoken = useSeconds(
    phase === "speak" && !isPaused && !isDiscarding,
    target + OVERTIME_SECONDS,
    () => {
      setPhase("analyze");
    }
  );

  function leave() {
    void navigate(
      rehearsal === undefined
        ? { to: "/" }
        : { params: { id: rehearsal }, to: "/rehearsals/$id" }
    );
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* Window drag handle, clear of the macOS traffic lights. */}
      <div data-tauri-drag-region className="h-12 shrink-0" />
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-8 px-6 pb-12 text-center">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl leading-tight font-semibold text-balance md:text-4xl">
            {topic}
          </h1>
        </div>

        <OrbFrame
          isCompact={phase === "analyze"}
          progress={phase === "speak" ? spoken / target : undefined}
          state={orbStateFor(phase, isPaused)}
        />

        {phase === "speak" && (
          <SpeakPhase
            elapsed={spoken}
            isPaused={isPaused}
            onCancel={() => {
              setIsDiscarding(true);
            }}
            onFinish={() => {
              setPhase("analyze");
            }}
            onPausedChange={setIsPaused}
            target={target}
          />
        )}
        {phase === "analyze" && (
          <AnalyzePhase
            onDone={() => {
              // ponytail: no attempt is saved yet, so a new topic opens the
              // latest rehearsal; open the new attempt once recording lands.
              const id =
                rehearsal ?? REHEARSAL_GROUPS.at(0)?.rehearsals.at(0)?.id;
              void navigate(
                id === undefined
                  ? { to: "/" }
                  : { params: { id }, to: "/rehearsals/$id" }
              );
            }}
          />
        )}
      </div>

      <AlertDialog isOpen={isDiscarding} onOpenChange={setIsDiscarding}>
        <AlertDialogHeader>
          <AlertDialogTitle>End this attempt?</AlertDialogTitle>
          <AlertDialogDescription>
            Your talk so far won’t be analysed or saved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep talking</AlertDialogCancel>
          <AlertDialogAction onPress={leave} variant="destructive">
            End attempt
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </main>
  );
}
