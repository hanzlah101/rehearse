import {
  BaseDirectory,
  exists,
  mkdir,
  readDir,
  readFile,
  remove,
  writeFile,
} from "@tauri-apps/plugin-fs";

// Recordings live in the app data directory (never sent anywhere, PLAN §9),
// one file per attempt. Paths are stored relative to it, e.g. recordings/x.webm.
// The fs capability (src-tauri/capabilities/default.json) only allows this
// folder.
export const RECORDINGS_DIR = "recordings";

const options = { baseDir: BaseDirectory.AppData };

// Preferred containers, in order. Chromium/WebView2 record Opus in WebM;
// WKWebView records AAC in MP4.
const FORMATS = [
  { extension: "webm", mimeType: "audio/webm;codecs=opus" },
  { extension: "webm", mimeType: "audio/webm" },
  { extension: "m4a", mimeType: "audio/mp4;codecs=mp4a.40.2" },
  { extension: "m4a", mimeType: "audio/mp4" },
  { extension: "ogg", mimeType: "audio/ogg;codecs=opus" },
];

export function pickRecordingFormat() {
  return FORMATS.find(({ mimeType }) =>
    MediaRecorder.isTypeSupported(mimeType)
  );
}

export function recordingPath(attemptId: string, extension: string) {
  return `${RECORDINGS_DIR}/${attemptId}.${extension}`;
}

export async function appendRecording(path: string, bytes: Uint8Array) {
  await mkdir(RECORDINGS_DIR, { ...options, recursive: true });
  await writeFile(path, bytes, { ...options, append: true });
}

// Rewrites the whole file, e.g. when an append failed mid-talk.
export async function writeRecording(path: string, bytes: Uint8Array) {
  await mkdir(RECORDINGS_DIR, { ...options, recursive: true });
  await writeFile(path, bytes, options);
}

export async function readRecording(path: string) {
  return await readFile(path, options);
}

export async function deleteRecording(path: string) {
  if (await exists(path, options)) {
    await remove(path, options);
  }
}

export async function listRecordings() {
  if (!(await exists(RECORDINGS_DIR, options))) {
    return [];
  }

  const entries = await readDir(RECORDINGS_DIR, options);

  return entries
    .filter((entry) => entry.isFile)
    .map((entry) => `${RECORDINGS_DIR}/${entry.name}`);
}
