import { isDefinedError, safe } from "@orpc/client";
import type { FeedbackStage } from "@server/modules/feedback/feedback.schemas";
import { feedbackStatusSchema } from "@server/modules/feedback/feedback.schemas";
import type { QueryClient } from "@tanstack/react-query";
import { subscribe } from "inngest/realtime";

import { formatDuration, formatNumber, formatPercent } from "@/lib/format";
import { deleteWav, prepareWav } from "@/modules/analysis/lib/audio";
import {
  computeMetrics,
  LONG_PAUSE_SECONDS,
  MIN_SPOKEN_WORDS,
  withoutAnnotations,
} from "@/modules/analysis/lib/metrics";
import type { Metrics } from "@/modules/analysis/lib/metrics";
import { buildReport, confirmedFillers } from "@/modules/analysis/lib/report";
import {
  cancelTranscription,
  downloadModel,
  isModelReady,
  measureProsody,
  readSpeech,
  transcribe,
  writeSpeech,
} from "@/modules/analysis/lib/speech";
import type { Prosody, Speech } from "@/modules/analysis/lib/speech";
import { api } from "@/modules/common/lib/orpc";
import {
  completeAnalysis,
  failAnalysis,
  getAnalysisTarget,
  listAttemptsToAnalyse,
  queueAnalysis,
  setFeedbackJob,
} from "@/modules/history/lib/rehearsals";
import type { AnalysisTarget } from "@/modules/history/lib/rehearsals";
import {
  LOCAL_QUERY_KEY,
  updateCachedAttempt,
} from "@/modules/history/queries/rehearsals";

// The background analysis job (PLAN §3). Local work runs one attempt at a
// time (it loads a 1.6 GB model): decode → WAV → CrisperWhisper → Praat →
// metrics. Then the transcript goes to the server, whose Inngest run reviews
// it with the LLM; that part runs on the server, so closing the app or going
// offline only pauses the waiting. Live status comes over Inngest realtime,
// with polling as the fallback. Progress is kept in memory for the UI;
// what's needed to resume after a restart is in SQLite (status, job id) and
// next to the audio (cached transcript).

export const ANALYSIS_STAGES = [
  "queued",
  "preparing",
  "downloading",
  "transcribing",
  "measuring",
  "reviewing",
  "scoring",
] as const;

export type AnalysisStage = (typeof ANALYSIS_STAGES)[number];

// What each finished step found, for the checkpoint list.
export type Findings = {
  content?: string;
  fillers?: string;
  language?: string;
  pauses?: string;
  score?: string;
  transcript?: string;
};

export type AnalysisProgress = {
  // Why it stopped; the attempt is marked failed in SQLite too.
  error: string | null;
  // 0–1 for steps that report it (model download, transcription).
  fraction: number | null;
  findings: Findings;
  // Waiting for the connection (review requests retry on their own).
  isOffline: boolean;
  // The server run's stage while reviewing.
  serverStage: FeedbackStage | null;
  stage: AnalysisStage;
};

const POLL_MS = 10_000;
const MAX_BACKOFF_MS = 60_000;

// A failure to show the student as is.
class AnalysisError extends Error {
  override name = "AnalysisError";
}

// Cancelled (attempt deleted, logged out): stop quietly. Same shape as an
// aborted signal's error, so both are handled alike.
function stopped() {
  return new DOMException("Analysis stopped", "AbortError");
}

function isStopped(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

type Context = {
  onReady: (attempt: AnalysisTarget, score: number) => void;
  queryClient: QueryClient;
  studentId: string;
};

let context: Context | null = null;
const progress = new Map<string, AnalysisProgress>();
const listeners = new Set<() => void>();
const controllers = new Map<string, AbortController>();
const localQueue: string[] = [];
let isLocalRunning = false;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeToAnalyses(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAnalysis(id: string) {
  return progress.get(id) ?? null;
}

function update(id: string, patch: Partial<AnalysisProgress>) {
  const current = progress.get(id) ?? {
    error: null,
    findings: {},
    fraction: null,
    isOffline: false,
    serverStage: null,
    stage: "queued",
  };
  progress.set(id, {
    ...current,
    ...patch,
    findings: { ...current.findings, ...patch.findings },
  });
  emit();
}

function forget(id: string) {
  progress.delete(id);
  controllers.delete(id);
  emit();
}

async function refresh() {
  await context?.queryClient.invalidateQueries({ queryKey: LOCAL_QUERY_KEY });
}

function throwIfStopped(signal: AbortSignal) {
  if (signal.aborted) {
    throw stopped();
  }
}

// Something that can end a sleep early (a realtime message).
type Waker = { wake: (() => void) | null };

async function sleep(ms: number, signal: AbortSignal, waker?: Waker) {
  // oxlint-disable-next-line promise/avoid-new -- timer to promise
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    signal.addEventListener("abort", done, { once: true });
    if (waker !== undefined) {
      waker.wake = done;
    }
  });
}

function messageOf(error: unknown) {
  if (error instanceof AnalysisError) {
    return error.message;
  }
  // Rust commands reject with their (student-facing) message.
  if (typeof error === "string" && error !== "") {
    return error;
  }
  return "Something went wrong while analysing this talk. Try again.";
}

// `signal`: an aborted run is a stop whatever error it ended with (whisper
// rejects with "Cancelled" when the runner stops mid-transcription).
async function fail(id: string, error: unknown, signal?: AbortSignal) {
  if (isStopped(error) || signal?.aborted === true) {
    forget(id);
    return;
  }
  console.error(`[analysis] ${id} failed`, error);
  const message = messageOf(error);
  await failAnalysis(id, message);
  controllers.delete(id);
  update(id, { error: message, fraction: null, isOffline: false });
  await refresh();
}

function describeLocal(metrics: Metrics): Findings {
  const fillers = metrics.fillers.length;
  return {
    fillers: `${formatNumber(fillers)} ${fillers === 1 ? "filler" : "fillers"}, ${formatNumber(metrics.wpm)} words a minute`,
    pauses:
      metrics.longestPause >= LONG_PAUSE_SECONDS
        ? `Longest pause ${formatNumber(metrics.longestPause, { maximumFractionDigits: 1 })}s`
        : "No long pauses",
    transcript: `${formatDuration(metrics.speechSeconds)} of speech, ${formatNumber(metrics.words.length)} words`,
  };
}

// Local steps

async function measure(id: string, wav: string): Promise<Prosody | null> {
  try {
    return await measureProsody(wav);
  } catch (error) {
    // Pitch and silences make the report better but aren't essential:
    // pauses fall back to word timings and delivery to a neutral score.
    console.warn(
      `[analysis] ${id}: Praat failed, continuing without it`,
      error
    );
    return null;
  }
}

async function transcribeLocally(
  target: AnalysisTarget,
  signal: AbortSignal
): Promise<Speech> {
  const cached = await readSpeech(target.id);
  if (cached !== null) {
    return cached;
  }

  update(target.id, { fraction: null, stage: "preparing" });
  const wav = await prepareWav(target.id, target.recordingPath);
  throwIfStopped(signal);

  if (!(await isModelReady())) {
    update(target.id, { fraction: 0, stage: "downloading" });
    await downloadModel((fraction) => {
      update(target.id, { fraction });
    });
    throwIfStopped(signal);
  }

  update(target.id, { fraction: 0, stage: "transcribing" });
  const words = await transcribe(target.id, wav, (fraction) => {
    update(target.id, { fraction });
  });
  throwIfStopped(signal);

  update(target.id, { fraction: null, stage: "measuring" });
  const prosody = await measure(target.id, wav);
  const speech = { prosody, words };
  await writeSpeech(target.id, speech);
  await deleteWav(target.id);
  return speech;
}

function metricsOf(target: AnalysisTarget, speech: Speech) {
  const words = withoutAnnotations(speech.words);
  if (words.length === 0) {
    throw new AnalysisError(
      "We couldn't hear any speech in this recording. Check that your microphone picks you up."
    );
  }
  if (words.length < MIN_SPOKEN_WORDS) {
    throw new AnalysisError(
      "We heard too little speech to give feedback. Check that your microphone picks you up, then try again."
    );
  }
  return computeMetrics(words, speech.prosody, target.topic);
}

// Server review

async function requestReview(
  target: AnalysisTarget,
  metrics: Metrics,
  signal: AbortSignal
) {
  const input = {
    attemptId: target.id,
    fillerCandidates: metrics.fillerCandidates.map(({ i, id, word }) => ({
      i,
      id,
      word,
    })),
    longPauses: metrics.longPauses.map(({ i, seconds }) => ({ i, seconds })),
    metrics: {
      fillersPerMinute: (metrics.fillers.length / metrics.speechSeconds) * 60,
      longestPauseSeconds: metrics.longestPause,
      pitchVariation: metrics.pitchVariation,
      wpm: metrics.wpm,
    },
    pauseCandidates: metrics.pauseCandidates.map(
      ({ beforeWord, i, id, kind }) => ({ beforeWord, i, id, kind })
    ),
    repetitionCandidates: metrics.repetitionCandidates,
    sentences: metrics.sentences.map(({ end, i, start, text }) => ({
      end,
      i,
      start,
      text,
    })),
    spokenSeconds: Math.max(1, target.spokenSeconds),
    targetSeconds: target.targetSeconds,
    topic: target.topic,
    topicId: target.topicId,
  };

  for (let attempt = 0; ; attempt += 1) {
    throwIfStopped(signal);
    // oxlint-disable-next-line no-await-in-loop -- retries one at a time
    const { data, error } = await safe(api.feedback.submit(input));
    if (error === null) {
      update(target.id, { isOffline: false, serverStage: data.stage });
      return data;
    }
    if (isDefinedError(error)) {
      if (error.code === "FEEDBACK_RATE_LIMITED") {
        throw new AnalysisError(error.message);
      }
      if (error.code === "UNAUTHORIZED") {
        // Logged out: it resumes after the next login.
        throw stopped();
      }
      if (
        error.code !== "FEEDBACK_UNAVAILABLE" &&
        error.code !== "INTERNAL_SERVER_ERROR"
      ) {
        throw new AnalysisError("This talk couldn't be sent for review.");
      }
    } else {
      update(target.id, { isOffline: true });
    }
    // oxlint-disable-next-line no-await-in-loop -- backoff between retries
    await sleep(Math.min(MAX_BACKOFF_MS, 5000 * 2 ** attempt), signal);
  }
}

async function finishReview(
  id: string,
  jobResult: NonNullable<Awaited<ReturnType<typeof api.feedback.get>>["result"]>
) {
  const target = await getAnalysisTarget(id);
  const speech = await readSpeech(id);
  if (target === null || target.status !== "processing") {
    forget(id);
    return;
  }
  if (speech === null) {
    // Retrying clears the job and transcribes again.
    throw new AnalysisError("This talk's transcript went missing. Try again.");
  }

  update(id, { serverStage: "done", stage: "scoring" });
  const metrics = metricsOf(target, speech);
  const { feedback, score } = buildReport({
    metrics,
    result: jobResult,
    spokenSeconds: Math.max(1, target.spokenSeconds),
    targetSeconds: target.targetSeconds,
  });
  const covered = feedback.keyPoints.filter(
    ({ depth }) => depth !== "missed"
  ).length;
  const { count: fillerCount } = confirmedFillers(metrics, jobResult);
  update(id, {
    findings: {
      content: `${formatNumber(covered)} of ${formatNumber(feedback.keyPoints.length)} key points covered`,
      fillers: `${formatNumber(fillerCount)} ${fillerCount === 1 ? "filler" : "fillers"}, ${formatNumber(metrics.wpm)} words a minute`,
      language: `${formatNumber(jobResult.language.grammar.length)} grammar fixes, ${formatNumber(jobResult.language.vocabulary.length)} stronger words`,
      score: `Score ${formatPercent(score)}`,
    },
  });
  await completeAnalysis(id, { feedback, score });
  if (context !== null) {
    updateCachedAttempt(
      context.queryClient,
      {
        attemptId: id,
        rehearsalId: target.rehearsalId,
        studentId: context.studentId,
      },
      { error: null, feedback, score, status: "ready" }
    );
  }
  await refresh();
  context?.onReady(target, score);
  // Keep the finished state briefly so an open checkpoint list can show it.
  setTimeout(() => {
    if (progress.get(id)?.stage === "scoring") {
      forget(id);
    }
  }, 5000);
}

// "lost": the server no longer has the job, so it's requested again.
type Check = "pending" | "done" | "lost";

async function checkReview(id: string, jobId: string): Promise<Check> {
  const { data, error } = await safe(api.feedback.get({ id: jobId }));
  if (error !== null) {
    if (isDefinedError(error) && error.code === "NOT_FOUND") {
      return "lost";
    }
    if (isDefinedError(error) && error.code === "UNAUTHORIZED") {
      throw stopped();
    }
    update(id, { isOffline: !isDefinedError(error) });
    return "pending";
  }

  update(id, { isOffline: false, serverStage: data.stage, stage: "reviewing" });
  if (data.status === "completed" && data.result !== null) {
    await finishReview(id, data.result);
    return "done";
  }
  if (data.status === "failed" || data.status === "cancelled") {
    throw new AnalysisError(
      data.error ?? "The review couldn't be finished. Try again."
    );
  }
  return "pending";
}

async function openRealtime(id: string, jobId: string, onChange: () => void) {
  const { data, error } = await safe(api.feedback.subscribe({ id: jobId }));
  if (error !== null) {
    return null;
  }
  try {
    return await subscribe({
      apiBaseUrl: data.apiBaseUrl ?? undefined,
      channel: data.channel,
      key: data.key,
      onError: () => {
        // Polling carries on; nothing to do.
      },
      onMessage: (message: { data: unknown }) => {
        const status = feedbackStatusSchema.safeParse(message.data);
        if (status.success) {
          update(id, { serverStage: status.data.stage });
          if (
            status.data.status !== "queued" &&
            status.data.status !== "running"
          ) {
            onChange();
          }
        }
      },
      topics: [data.topic],
    });
  } catch {
    return null;
  }
}

async function waitForReview(id: string, jobId: string, signal: AbortSignal) {
  update(id, { fraction: null, stage: "reviewing" });
  const waker: Waker = { wake: null };
  const realtime = await openRealtime(id, jobId, () => {
    waker.wake?.();
  });

  try {
    for (;;) {
      throwIfStopped(signal);
      // oxlint-disable-next-line no-await-in-loop -- poll until done
      const check = await checkReview(id, jobId);
      if (check !== "pending") {
        return check;
      }
      // oxlint-disable-next-line no-await-in-loop -- poll until done
      await sleep(POLL_MS, signal, waker);
    }
  } finally {
    realtime?.close();
  }
}

// Runs after the local steps, or straight away when a job already exists.
async function review(
  target: AnalysisTarget,
  metrics: Metrics,
  signal: AbortSignal
) {
  try {
    let jobId = target.feedbackJobId;
    for (;;) {
      if (jobId === null) {
        // oxlint-disable-next-line no-await-in-loop -- request, then wait
        const job = await requestReview(target, metrics, signal);
        jobId = job.id;
        // oxlint-disable-next-line no-await-in-loop -- request, then wait
        await setFeedbackJob(target.id, jobId);
      }
      // oxlint-disable-next-line no-await-in-loop -- request, then wait
      if ((await waitForReview(target.id, jobId, signal)) === "done") {
        return;
      }
      jobId = null;
      // oxlint-disable-next-line no-await-in-loop -- request, then wait
      await setFeedbackJob(target.id, null);
    }
  } catch (error) {
    await fail(target.id, error, signal);
  }
}

// The queue

async function runLocal(id: string) {
  const signal = controllers.get(id)?.signal;
  if (signal === undefined) {
    return;
  }
  const target = await getAnalysisTarget(id);
  if (
    target === null ||
    target.status !== "processing" ||
    target.studentId !== context?.studentId
  ) {
    forget(id);
    return;
  }
  let metrics: Metrics;
  try {
    const speech = await transcribeLocally(target, signal);
    metrics = metricsOf(target, speech);
    update(id, { findings: describeLocal(metrics) });
  } catch (error) {
    await fail(id, error, signal);
    return;
  }
  // The review waits on the network, not this machine: let the next attempt
  // start its local steps meanwhile.
  void review(target, metrics, signal);
}

async function drainLocal() {
  if (isLocalRunning) {
    return;
  }
  isLocalRunning = true;
  try {
    for (
      let id = localQueue.shift();
      id !== undefined;
      id = localQueue.shift()
    ) {
      // oxlint-disable-next-line no-await-in-loop -- one model at a time
      await runLocal(id);
    }
  } finally {
    isLocalRunning = false;
  }
}

export function enqueueAnalysis(id: string) {
  if (context === null || controllers.has(id)) {
    return;
  }
  controllers.set(id, new AbortController());
  progress.delete(id);
  update(id, { stage: "queued" });
  localQueue.push(id);
  void drainLocal();
}

// Puts a failed (or interrupted) attempt back in the queue.
export async function retryAnalysis(id: string) {
  await queueAnalysis(id);
  await refresh();
  enqueueAnalysis(id);
}

async function cancelQuietly(id: string) {
  try {
    await cancelTranscription(id);
  } catch {
    // Nothing was transcribing.
  }
}

// Stops an attempt's analysis (it's being deleted).
export async function cancelAnalysis(id: string) {
  controllers.get(id)?.abort();
  const queued = localQueue.indexOf(id);
  if (queued !== -1) {
    localQueue.splice(queued, 1);
  }
  forget(id);
  await cancelQuietly(id);
}

// Logged out: stop everything; unfinished work resumes on the next login.
export function stopAnalysisRunner() {
  for (const controller of controllers.values()) {
    controller.abort();
  }
  for (const id of controllers.keys()) {
    void cancelQuietly(id);
  }
  localQueue.length = 0;
  controllers.clear();
  progress.clear();
  context = null;
  emit();
}

// Called once the student is known: resumes every unfinished analysis.
export async function startAnalysisRunner(next: Context) {
  if (context?.studentId !== next.studentId) {
    stopAnalysisRunner();
  }
  context = next;
  const ids = await listAttemptsToAnalyse(next.studentId);
  for (const id of ids) {
    enqueueAnalysis(id);
  }
}
