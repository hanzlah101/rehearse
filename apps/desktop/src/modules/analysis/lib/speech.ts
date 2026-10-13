import { Channel, invoke } from "@tauri-apps/api/core";
import { z } from "zod";

import {
  deleteRecording,
  readRecording,
  writeRecording,
} from "@/modules/common/lib/recordings";

// Local speech analysis in Rust (src-tauri/src/speech.rs): CrisperWhisper via
// whisper.cpp and Praat. Results are cached next to the audio
// (recordings/<id>.speech.json) so a retry never transcribes twice.

export type Word = { end: number; start: number; text: string };

export type Prosody = {
  duration: number;
  // [seconds, dB] every 100 ms.
  intensity: [number, number][];
  // [seconds, Hz] every 20 ms; 0 where unvoiced.
  pitch: [number, number][];
  // [start, end] of silences of at least 0.3 s.
  silences: [number, number][];
};

// Bumped whenever transcription changes in a way old caches lack (2: fillers
// from CrisperWhisper's verbatim mode; 3: DTW-aligned word onsets), so those
// attempts transcribe again.
const SPEECH_VERSION = 3;

export type Speech = {
  // null when Praat couldn't measure this recording.
  prosody: Prosody | null;
  words: Word[];
};

type ModelStatus = { ready: boolean; totalBytes: number };
type DownloadProgress = { downloadedBytes: number; totalBytes: number };

export async function isModelReady() {
  const status = await invoke<ModelStatus>("speech_model_status");
  return status.ready;
}

// First use only: ~1.6 GB, resumable, checksum verified in Rust.
export async function downloadModel(onProgress: (fraction: number) => void) {
  const channel = new Channel<DownloadProgress>(
    ({ downloadedBytes, totalBytes }) => {
      onProgress(downloadedBytes / totalBytes);
    }
  );
  await invoke("speech_download_model", { onProgress: channel });
}

export async function transcribe(
  attemptId: string,
  wavPath: string,
  onProgress: (fraction: number) => void
) {
  const channel = new Channel<number>((percent) => {
    onProgress(percent / 100);
  });
  return await invoke<Word[]>("speech_transcribe", {
    attemptId,
    onProgress: channel,
    wavPath,
  });
}

export async function cancelTranscription(attemptId: string) {
  await invoke("speech_cancel", { attemptId });
}

export async function measureProsody(wavPath: string) {
  return await invoke<Prosody>("speech_prosody", { wavPath });
}

export function speechPath(attemptId: string) {
  return `recordings/${attemptId}.speech.json`;
}

const pair = z.tuple([z.number(), z.number()]);

// The cache is ours, but a file on disk can be anything: check it.
const speechSchema = z.object({
  prosody: z
    .object({
      duration: z.number(),
      intensity: z.array(pair),
      pitch: z.array(pair),
      silences: z.array(pair),
    })
    .nullable(),
  version: z.literal(SPEECH_VERSION),
  words: z.array(
    z.object({ end: z.number(), start: z.number(), text: z.string() })
  ),
});

export async function readSpeech(attemptId: string): Promise<Speech | null> {
  try {
    const bytes = await readRecording(speechPath(attemptId));
    const parsed = speechSchema.safeParse(
      JSON.parse(new TextDecoder().decode(bytes))
    );
    return parsed.success
      ? { prosody: parsed.data.prosody, words: parsed.data.words }
      : null;
  } catch {
    return null;
  }
}

export async function writeSpeech(attemptId: string, speech: Speech) {
  await writeRecording(
    speechPath(attemptId),
    new TextEncoder().encode(
      JSON.stringify({ ...speech, version: SPEECH_VERSION })
    )
  );
}

export async function deleteSpeech(attemptId: string) {
  await deleteRecording(speechPath(attemptId));
}
