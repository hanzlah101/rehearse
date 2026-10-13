import {
  appendRecording,
  writeRecording,
} from "@/modules/common/lib/recordings";

// How often MediaRecorder hands over audio. Each chunk is appended to the file
// right away, so a crash loses at most this much.
const CHUNK_MS = 1000;
const BITS_PER_SECOND = 64_000;

export type Recording = {
  pause: () => void;
  resume: () => void;
  // Stops, flushes the last chunk and makes sure the file on disk is complete.
  // Safe to call again (e.g. retrying after a failed rewrite).
  stop: () => Promise<void>;
};

// Records `stream` into `path` (relative to the app data directory) as it
// goes. Chunks are also kept in memory: if an append fails (disk full, file
// locked) the whole file is rewritten from memory on stop, so nothing said is
// lost unless that also fails, in which case stop() rejects.
export function startRecording({
  mimeType,
  onError,
  path,
  stream,
}: {
  mimeType: string;
  onError: (error: unknown) => void;
  path: string;
  stream: MediaStream;
}): Recording {
  const recorder = new MediaRecorder(stream, {
    audioBitsPerSecond: BITS_PER_SECOND,
    mimeType,
  });
  const chunks: Blob[] = [];
  const queue: Blob[] = [];
  let draining: Promise<void> | null = null;
  let appendFailed = false;

  // Appends queued chunks one after another, in order.
  async function drain() {
    for (let data = queue.shift(); data !== undefined; data = queue.shift()) {
      if (!appendFailed) {
        try {
          // oxlint-disable-next-line no-await-in-loop -- chunks append in order
          await appendRecording(path, new Uint8Array(await data.arrayBuffer()));
        } catch {
          appendFailed = true;
        }
      }
    }
    draining = null;
  }

  recorder.addEventListener("dataavailable", ({ data }) => {
    if (data.size === 0) {
      return;
    }
    chunks.push(data);
    queue.push(data);
    draining ??= drain();
  });
  recorder.addEventListener("error", onError);
  // The recorder can also stop by itself (the mic is unplugged, an error);
  // either way the final chunk's dataavailable fires before "stop".
  // oxlint-disable-next-line promise/avoid-new -- event to promise
  const stopped = new Promise((resolve) => {
    recorder.addEventListener("stop", resolve, { once: true });
  });
  recorder.start(CHUNK_MS);

  return {
    pause: () => {
      if (recorder.state === "recording") {
        recorder.pause();
      }
    },
    resume: () => {
      if (recorder.state === "paused") {
        recorder.resume();
      }
    },
    stop: async () => {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
      await stopped;
      await draining;

      if (appendFailed) {
        const whole = await new Blob(chunks).arrayBuffer();
        await writeRecording(path, new Uint8Array(whole));
      }
    },
  };
}
