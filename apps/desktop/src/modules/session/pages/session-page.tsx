import { useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
import { formatDuration } from "@/lib/format";
import { enqueueAnalysis } from "@/modules/analysis/lib/runner";
import { useSession } from "@/modules/auth/queries/session";
import { pickRecordingFormat } from "@/modules/common/lib/recordings";
import {
  MIN_SPOKEN_SECONDS,
  completeAttempt,
  discardAttempt,
  recoverAttempts,
  startAttempt,
  updateSpokenSeconds,
} from "@/modules/history/lib/rehearsals";
import { LOCAL_QUERY_KEY } from "@/modules/history/queries/rehearsals";
import { AnalyzePhase } from "@/modules/session/components/analyze-phase";
import type { SaveState } from "@/modules/session/components/analyze-phase";
import { OrbFrame } from "@/modules/session/components/orb-frame";
import { SetupPhase } from "@/modules/session/components/setup-phase";
import { SpeakPhase } from "@/modules/session/components/speak-phase";
import { startRecording } from "@/modules/session/lib/recorder";
import type { Recording } from "@/modules/session/lib/recorder";
import { useMicrophone } from "@/modules/session/lib/use-microphone";
import { useSeconds } from "@/modules/session/lib/use-seconds";

const routeApi = getRouteApi("/(private)/session");

// Recording stops by itself this long after the target (PLAN §2.4).
const OVERTIME_SECONDS = 60;

// How often the talk length is written to the attempt while recording, so an
// attempt recovered after a crash knows roughly how long it is.
const PERSIST_EVERY_SECONDS = 5;

type Phase = "setup" | "speak" | "analyze";

// The attempt being recorded: its row, its file and the stream feeding it.
type Take = Awaited<ReturnType<typeof startAttempt>> & {
  recording: Recording;
  stream: MediaStream;
};

function orbStateFor(phase: Phase, isListening: boolean): OrbState {
  if (phase === "analyze") {
    return "thinking";
  }

  return isListening ? "listening" : "idle";
}

async function persistSpokenSeconds(id: string, seconds: number) {
  try {
    await updateSpokenSeconds(id, seconds);
  } catch {
    // Best effort: the final length is saved when the talk ends.
  }
}

// Creates the attempt row before the first byte (so a crash leaves it to
// recover), then starts writing the mic into its file.
async function beginTake(
  input: Parameters<typeof startAttempt>[0],
  stream: MediaStream,
  onError: () => void
): Promise<Take> {
  const attempt = await startAttempt(input);
  let recording: Recording | null = null;

  try {
    recording = startRecording({
      mimeType: input.mimeType,
      onError,
      path: attempt.path,
      stream,
    });
  } catch {
    // MediaRecorder refused the stream or format.
  }

  if (recording === null) {
    await discardAttempt(attempt.id);
    throw new Error("Couldn’t start the recorder.");
  }

  return { ...attempt, recording, stream };
}

// Leaving mid-talk keeps what was recorded: the file is closed and launch
// recovery's rules apply (interrupted if long enough, deleted otherwise).
async function abandonTake(
  take: Take,
  seconds: number,
  queryClient: QueryClient
) {
  try {
    await take.recording.stop();
    await updateSpokenSeconds(take.id, seconds);
    await recoverAttempts();
  } catch {
    // Launch recovery tries again next time.
  }
  await queryClient.invalidateQueries({ queryKey: LOCAL_QUERY_KEY });
}

function Session({ onRestart }: { onRestart: () => void }) {
  const { minutes, rehearsal, topic, topicId } = routeApi.useSearch();
  const { student } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const microphone = useMicrophone();
  const [phase, setPhase] = useState<Phase>("setup");
  const [take, setTake] = useState<Take | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [save, setSave] = useState<SaveState>("saving");
  // The take until it's saved or discarded, for cleanup on unmount.
  const unfinished = useRef<{ seconds: number; take: Take } | null>(null);
  const target = minutes * 60;
  // The clock (and the recorder) stop while paused, while the cancel
  // confirmation is open, and once the mic is gone.
  const isTalking =
    phase === "speak" && !isPaused && !isCancelling && !isStopped;

  async function start() {
    const { stream } = microphone;
    const format = pickRecordingFormat();

    if (stream === null) {
      return;
    }
    if (format === undefined) {
      toast.error("This computer can’t record audio in a supported format.");
      return;
    }

    setIsStarting(true);
    try {
      const next = await beginTake(
        {
          ...format,
          rehearsalId: rehearsal,
          studentId: student.id,
          targetSeconds: target,
          topic,
          topicId,
        },
        stream,
        () => {
          setIsStopped(true);
        }
      );
      unfinished.current = { seconds: 0, take: next };
      setTake(next);
      setPhase("speak");
    } catch {
      toast.error("Couldn’t start recording. Try again.");
    }
    setIsStarting(false);
  }

  // Closes the file and marks the attempt for analysis. Safe to retry.
  async function saveTake(current: Take, seconds: number) {
    setSave("saving");
    try {
      await current.recording.stop();
      await completeAttempt(current.id, {
        spokenSeconds: seconds,
        status: "processing",
      });
      unfinished.current = null;
      setSave("saved");
      enqueueAnalysis(current.id);
    } catch {
      setSave("failed");
    }
    await queryClient.invalidateQueries({ queryKey: LOCAL_QUERY_KEY });
  }

  async function finish(seconds: number) {
    if (take === null || phase !== "speak") {
      return;
    }
    setPhase("analyze");
    await saveTake(take, seconds);
  }

  // Deletes the attempt (and its file), then `next`.
  async function discard(next: () => void) {
    setIsDiscarding(true);
    try {
      if (take !== null) {
        await take.recording.stop();
        await discardAttempt(take.id);
      }
      unfinished.current = null;
    } catch {
      toast.error("Couldn’t delete this attempt’s recording.");
    }
    await queryClient.invalidateQueries({ queryKey: LOCAL_QUERY_KEY });
    next();
  }

  function openThread() {
    if (take !== null) {
      void navigate({
        params: { id: take.rehearsalId },
        replace: true,
        to: "/rehearsals/$id",
      });
    }
  }

  function leave() {
    void navigate(
      rehearsal === undefined
        ? { to: "/" }
        : { params: { id: rehearsal }, to: "/rehearsals/$id" }
    );
  }

  const spoken = useSeconds(isTalking, target + OVERTIME_SECONDS, () => {
    void finish(target + OVERTIME_SECONDS);
  });

  useEffect(() => {
    if (isTalking) {
      take?.recording.resume();
    } else {
      take?.recording.pause();
    }
  }, [isTalking, take]);

  useEffect(() => {
    if (unfinished.current !== null) {
      unfinished.current.seconds = spoken;
    }
    if (take !== null && spoken > 0 && spoken % PERSIST_EVERY_SECONDS === 0) {
      void persistSpokenSeconds(take.id, spoken);
    }
  }, [spoken, take]);

  // An unplugged mic ends its track (and stops the recorder).
  useEffect(() => {
    const tracks = take?.stream.getAudioTracks() ?? [];
    function onEnded() {
      setIsStopped(true);
    }
    for (const track of tracks) {
      track.addEventListener("ended", onEnded);
    }
    return () => {
      for (const track of tracks) {
        track.removeEventListener("ended", onEnded);
      }
    };
  }, [take]);

  useEffect(
    () => () => {
      const left = unfinished.current;
      if (left !== null) {
        void abandonTake(left.take, left.seconds, queryClient);
      }
    },
    [queryClient]
  );

  const isListening =
    phase === "setup" ? microphone.stream !== null : isTalking;

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* Window drag handle, clear of the macOS traffic lights. */}
      <div data-tauri-drag-region className="h-12 shrink-0" />
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-8 px-6 pb-12 text-center">
        <h1 className="text-3xl leading-tight font-semibold text-balance md:text-4xl">
          {topic}
        </h1>

        <OrbFrame
          getVolume={isListening ? microphone.getLevel : undefined}
          isCompact={phase === "analyze"}
          progress={phase === "speak" ? spoken / target : undefined}
          state={orbStateFor(phase, isListening)}
        />

        {phase === "setup" && (
          <SetupPhase
            deviceId={microphone.deviceId}
            devices={microphone.devices}
            isReady={microphone.stream !== null}
            isStarting={isStarting}
            onBack={leave}
            onDeviceChange={(deviceId) => {
              microphone.selectDevice(deviceId);
            }}
            onStart={() => {
              void start();
            }}
            problem={microphone.problem}
          />
        )}
        {phase === "speak" && (
          <SpeakPhase
            elapsed={spoken}
            isPaused={isPaused}
            onCancel={() => {
              setIsCancelling(true);
            }}
            onFinish={() => {
              void finish(spoken);
            }}
            onPausedChange={setIsPaused}
            target={target}
          />
        )}
        {phase === "analyze" && take !== null && (
          <AnalyzePhase
            isDiscarding={isDiscarding}
            onDiscard={() => {
              void discard(leave);
            }}
            attemptId={take.id}
            onBackground={openThread}
            onDone={openThread}
            onRetrySave={() => {
              void saveTake(take, spoken);
            }}
            save={save}
            spokenSeconds={spoken}
          />
        )}
      </div>

      <AlertDialog
        isKeyboardDismissDisabled={isDiscarding}
        isOpen={isCancelling}
        onOpenChange={setIsCancelling}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>End this attempt?</AlertDialogTitle>
          <AlertDialogDescription>
            Your talk so far won’t be analysed or saved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel isDisabled={isDiscarding}>
            Keep talking
          </AlertDialogCancel>
          <AlertDialogAction
            isLoading={isDiscarding}
            onPress={() => {
              void discard(leave);
            }}
            variant="destructive"
          >
            End attempt
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>

      <AlertDialog
        isKeyboardDismissDisabled
        isOpen={isStopped && phase === "speak"}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Recording stopped</AlertDialogTitle>
          <AlertDialogDescription>
            {spoken >= MIN_SPOKEN_SECONDS
              ? `Your microphone stopped sending audio. Get feedback on the ${formatDuration(spoken)} you said, or start over.`
              : "Your microphone stopped sending audio before there was enough to analyse. Check it and start over."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            isLoading={isDiscarding}
            onPress={() => {
              void discard(onRestart);
            }}
            variant="outline"
          >
            Start over
          </AlertDialogAction>
          {spoken >= MIN_SPOKEN_SECONDS && (
            <AlertDialogAction
              isDisabled={isDiscarding}
              onPress={() => {
                setIsStopped(false);
                void finish(spoken);
              }}
            >
              Get feedback
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialog>
    </main>
  );
}

// Full-screen rehearsal: setup (pick the mic, check the orb reacts) → speak →
// save and analyse, with one orb that changes state instead of remounting.
// "Start over" remounts the whole session, mic included.
export function SessionPage() {
  const [run, setRun] = useState(0);

  return (
    <Session
      key={run}
      onRestart={() => {
        setRun((value) => value + 1);
      }}
    />
  );
}
