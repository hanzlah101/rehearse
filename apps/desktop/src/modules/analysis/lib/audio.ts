import {
  deleteRecording,
  readRecording,
  writeRecording,
} from "@/modules/common/lib/recordings";

// Whisper and Praat both read 16 kHz mono 16-bit WAV; recordings are WebM/Opus
// or MP4/AAC. The webview decodes them (no codec to ship) and resamples.
const SAMPLE_RATE = 16_000;

export function wavPath(attemptId: string) {
  return `recordings/${attemptId}.wav`;
}

function encodeWav(samples: Float32Array) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  // ASCII chunk ids only.
  const text = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.codePointAt(index) ?? 0);
    }
  };

  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  // PCM, mono
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);

  for (const [index, sample] of samples.entries()) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, Math.round(clamped * 32_767), true);
  }

  return new Uint8Array(buffer);
}

// Decodes the recording and writes recordings/<id>.wav next to it.
export async function prepareWav(attemptId: string, recordingPath: string) {
  const bytes = await readRecording(recordingPath);
  const context = new AudioContext();
  let decoded: AudioBuffer;

  try {
    decoded = await context.decodeAudioData(new Uint8Array(bytes).buffer);
  } catch {
    throw new Error("This recording couldn't be decoded.");
  } finally {
    void context.close();
  }

  const length = Math.ceil(decoded.duration * SAMPLE_RATE);
  if (length === 0) {
    throw new Error("This recording is empty.");
  }

  // Rendering through a 1-channel context at 16 kHz downmixes and resamples.
  const offline = new OfflineAudioContext(1, length, SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();

  const path = wavPath(attemptId);
  await writeRecording(path, encodeWav(rendered.getChannelData(0)));
  return path;
}

export async function deleteWav(attemptId: string) {
  await deleteRecording(wavPath(attemptId));
}
