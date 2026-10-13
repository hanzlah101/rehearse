import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useWavesurfer } from "@wavesurfer/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Slider, SliderThumb, SliderTrack } from "react-aria-components";
import Hover from "wavesurfer.js/plugins/hover";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatDuration, formatNumber } from "@/lib/format";
import { useIsDark } from "@/lib/theme";
import { readRecording } from "@/modules/common/lib/recordings";

const SPEEDS = [1, 1.25, 1.5, 0.75];

// wavesurfer paints on a canvas, which can't read CSS variables, so theme
// colours are resolved to values (re-read when the theme flips).
function themeColor(name: string) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--${name}`)
    .trim();
}

function Player({ audio }: { audio: Blob }) {
  const container = useRef<HTMLDivElement>(null);
  const isDark = useIsDark();
  const [speed, setSpeed] = useState(1);

  const options = useMemo(
    () => ({
      barGap: 2,
      barRadius: 2,
      barWidth: 3,
      cursorWidth: 0,
      dragToSeek: true,
      height: 40,
      normalize: true,
      plugins: [
        Hover.create({
          formatTimeCallback: (seconds: number) => formatDuration(seconds),
          labelBackground: themeColor("foreground"),
          labelColor: themeColor("background"),
          labelSize: "11px",
          lineColor: themeColor("foreground"),
          lineWidth: 1.5,
        }),
      ],
      progressColor: themeColor("primary"),
      // Opaque on purpose: wavesurfer tints the played part through the wave's
      // alpha, so a translucent colour (dark --input) would dim the progress.
      waveColor: themeColor(isDark ? "secondary" : "border"),
    }),
    [isDark]
  );

  const { currentTime, isPlaying, isReady, wavesurfer } = useWavesurfer({
    container,
    ...options,
  });

  // A theme flip recreates the instance, so the audio loads into each one.
  useEffect(() => {
    void wavesurfer?.loadBlob(audio);
  }, [audio, wavesurfer]);
  const duration = isReady ? (wavesurfer?.getDuration() ?? 0) : 0;

  return (
    <div className="flex items-center gap-4">
      <Button
        aria-label={isPlaying ? "Pause recording" : "Play recording"}
        isDisabled={!isReady}
        onPress={() => {
          void wavesurfer?.playPause();
        }}
        size="icon-lg"
      >
        {isPlaying ? <IconPlayerPauseFilled /> : <IconPlayerPlayFilled />}
      </Button>

      <div className="relative min-w-0 flex-1">
        {/* Pointer: wavesurfer (click/drag to seek, hover line with time). */}
        <div aria-hidden="true" ref={container} />
        {/* Keyboard and screen readers: an invisible slider on top that lets
            pointer events through to the waveform. */}
        <Slider
          aria-label="Position in recording"
          className="pointer-events-none absolute inset-0"
          formatOptions={{ maximumFractionDigits: 0 }}
          isDisabled={!isReady}
          maxValue={Math.max(duration, 0.01)}
          onChange={(seconds) => {
            wavesurfer?.setTime(seconds);
          }}
          step={1}
          value={currentTime}
        >
          <SliderTrack className="group/track size-full rounded-md">
            <SliderThumb className="size-full opacity-0 outline-hidden data-focus-visible:opacity-100 data-focus-visible:outline-2 data-focus-visible:outline-offset-4 data-focus-visible:outline-ring data-focus-visible:outline-solid" />
          </SliderTrack>
        </Slider>
      </div>

      <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
        {formatDuration(currentTime)} / {formatDuration(duration)}
      </span>

      <Button
        aria-label={`Playback speed ${formatNumber(speed)}×`}
        className="w-14 shrink-0"
        onPress={() => {
          const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length] ?? 1;
          wavesurfer?.setPlaybackRate(next);
          setSpeed(next);
        }}
        size="sm"
        variant="muted"
      >
        {formatNumber(speed)}×
      </Button>
    </div>
  );
}

function recordingQueryOptions(path: string, mimeType: string) {
  return queryOptions({
    // Dropped as soon as no player shows it; a talk is a few MB.
    gcTime: 0,
    queryFn: async () => {
      const bytes = await readRecording(path);
      return new Blob([new Uint8Array(bytes)], { type: mimeType });
    },
    // Outside LOCAL_QUERY_KEY: a saved recording never changes, and the
    // invalidation after every local write would reload (and stop) it.
    queryKey: ["recording", path],
    staleTime: Infinity,
  });
}

// The attempt's audio, read from the app data folder (it never leaves this
// device).
export function RecordingPlayer({
  mimeType,
  path,
}: {
  mimeType: string;
  path: string;
}) {
  const titleId = useId();
  const recording = useQuery(recordingQueryOptions(path, mimeType));

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 id={titleId} className="text-lg font-semibold">
          Your recording
        </h3>
        <p className="text-sm text-pretty text-muted-foreground">
          Listen back, then read what you said below. It never leaves this
          device.
        </p>
      </div>
      {recording.isPending && (
        <div className="flex h-10 items-center text-muted-foreground">
          <Spinner />
        </div>
      )}
      {recording.isError && (
        <p className="text-sm text-destructive">
          This recording is missing from this computer.
        </p>
      )}
      {recording.isSuccess && <Player audio={recording.data} />}
    </section>
  );
}
