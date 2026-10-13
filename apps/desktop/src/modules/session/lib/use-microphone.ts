import { useEffect, useEffectEvent, useRef, useState } from "react";

const DEVICE_KEY = "microphone-device";

// Clean speech for analysis: no echo cancellation (nothing plays back) and no
// automatic gain (it would flatten the loudness the report measures).
const CONSTRAINTS = {
  autoGainControl: false,
  echoCancellation: false,
  noiseSuppression: true,
} satisfies MediaTrackConstraints;

// null = the system default input.
function storedDevice(): string | null {
  try {
    return localStorage.getItem(DEVICE_KEY);
  } catch {
    return null;
  }
}

function storeDevice(deviceId: string | null) {
  try {
    if (deviceId === null) {
      localStorage.removeItem(DEVICE_KEY);
    } else {
      localStorage.setItem(DEVICE_KEY, deviceId);
    }
  } catch {
    // Not remembered; the default microphone is used next time.
  }
}

export type MicrophoneProblem = "denied" | "no-device" | "unavailable";

function problemFor(failure: unknown): MicrophoneProblem {
  if (failure instanceof DOMException) {
    if (
      failure.name === "NotAllowedError" ||
      failure.name === "SecurityError"
    ) {
      return "denied";
    }
    if (failure.name === "NotFoundError") {
      return "no-device";
    }
  }
  return "unavailable";
}

function isMissingDevice(failure: unknown) {
  return (
    failure instanceof DOMException &&
    (failure.name === "OverconstrainedError" ||
      failure.name === "NotFoundError")
  );
}

// The selected microphone's live stream, the inputs to pick from, and
// getLevel() (0–1, how loud it is right now) for the orb. Remembers the chosen
// input and falls back to the default one if it disappears.
export function useMicrophone() {
  const [deviceId, setDeviceId] = useState(storedDevice);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [problem, setProblem] = useState<MicrophoneProblem | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const samples = useRef<Float32Array<ArrayBuffer> | null>(null);

  const refreshDevices = useEffectEvent(async () => {
    const all = await navigator.mediaDevices.enumerateDevices();
    const inputs = all.filter(({ kind }) => kind === "audioinput");
    setDevices(inputs);

    // The chosen input was unplugged: go back to the default.
    if (
      deviceId !== null &&
      !inputs.some((input) => input.deviceId === deviceId)
    ) {
      storeDevice(null);
      setDeviceId(null);
    }
  });

  useEffect(() => {
    let isCurrent = true;
    let opened: MediaStream | null = null;
    let context: AudioContext | null = null;

    async function open() {
      try {
        opened = await navigator.mediaDevices.getUserMedia({
          audio:
            deviceId === null
              ? CONSTRAINTS
              : { ...CONSTRAINTS, deviceId: { exact: deviceId } },
        });
      } catch (error) {
        if (!isCurrent) {
          return;
        }
        // A remembered input that's gone: retry with the default.
        if (deviceId !== null && isMissingDevice(error)) {
          storeDevice(null);
          setDeviceId(null);
          return;
        }
        setStream(null);
        setProblem(problemFor(error));
        return;
      }

      if (!isCurrent) {
        for (const track of opened.getTracks()) {
          track.stop();
        }
        return;
      }

      context = new AudioContext();
      const node = context.createAnalyser();
      node.fftSize = 1024;
      context.createMediaStreamSource(opened).connect(node);
      analyser.current = node;
      samples.current = new Float32Array(node.fftSize);
      void context.resume();

      setProblem(null);
      setStream(opened);
      await refreshDevices();
    }

    void open();

    return () => {
      isCurrent = false;
      analyser.current = null;
      void context?.close();
      for (const track of opened?.getTracks() ?? []) {
        track.stop();
      }
    };
  }, [deviceId]);

  useEffect(() => {
    function onChange() {
      void refreshDevices();
    }
    navigator.mediaDevices.addEventListener("devicechange", onChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", onChange);
    };
  }, []);

  function getLevel() {
    const node = analyser.current;
    const buffer = samples.current;
    if (node === null || buffer === null) {
      return 0;
    }
    node.getFloatTimeDomainData(buffer);
    let sum = 0;
    for (const sample of buffer) {
      sum += sample * sample;
    }
    // Speech RMS sits around 0.02–0.2; scale it into 0–1 for the orb.
    return Math.min(1, Math.sqrt(sum / buffer.length) * 6);
  }

  return {
    // The input actually in use (the default resolves to a real device id).
    deviceId:
      stream?.getAudioTracks()[0]?.getSettings().deviceId ?? deviceId ?? null,
    devices,
    getLevel,
    problem,
    selectDevice: (id: string) => {
      storeDevice(id);
      setDeviceId(id);
    },
    stream,
  };
}
