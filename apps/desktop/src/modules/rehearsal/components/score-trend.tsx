import { IconFlagFilled } from "@tabler/icons-react";
import {
  areaY,
  defineChart,
  dot,
  lineY,
  text,
  whenFocused,
} from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { scalePoint } from "@tanstack/charts/scales/point";
import { useMemo } from "react";

import { formatPercent } from "@/lib/format";
import type { Attempt } from "@/modules/history/lib/rehearsals";

// Score across attempts. Clicking a point (or focusing it with the arrow keys
// and pressing Enter) picks that attempt.
export function ScoreTrend({
  attempts,
  onSelect,
  selected,
}: {
  attempts: Attempt[];
  onSelect: (n: number) => void;
  selected: number;
}) {
  const definition = useMemo(() => {
    const rows = attempts.map((attempt) => ({
      label: `Attempt ${attempt.n}`,
      n: attempt.n,
      score: attempt.score,
    }));
    const picked = rows.filter((row) => row.n === selected);
    // Start a little under the lowest score so small gains stay visible.
    const floor = Math.max(
      0,
      Math.floor((Math.min(...rows.map((row) => row.score)) - 15) / 10) * 10
    );

    return defineChart({
      // The built-in ring also lands on the value labels; the halo below
      // replaces it.
      focusRing: false,
      gradients: [
        {
          id: "score-fill",
          stops: [
            { color: "var(--primary)", offset: 0, opacity: 0 },
            { color: "var(--primary)", offset: 1, opacity: 0.22 },
          ],
          x1: 0,
          x2: 0,
          y1: 1,
          y2: 0,
        },
      ],
      marks: [
        areaY(rows, {
          fill: "url(#score-fill)",
          fillOpacity: 1,
          x: "label",
          y1: floor,
          y2: "score",
        }),
        lineY(rows, {
          stroke: "var(--primary)",
          strokeWidth: 2.5,
          x: "label",
          y: "score",
        }),
        whenFocused(
          dot(rows, {
            fill: "var(--primary)",
            fillOpacity: 0.1,
            id: "hover-halo",
            r: 13,
            x: "label",
            y: "score",
          }),
          { match: "x" }
        ),
        dot(picked, {
          fill: "var(--primary)",
          fillOpacity: 0.16,
          r: 13,
          x: "label",
          y: "score",
        }),
        dot(rows, {
          fill: "var(--card)",
          stroke: "var(--primary)",
          strokeWidth: 2.5,
          x: "label",
          y: "score",
        }),
        dot(picked, { fill: "var(--primary)", r: 6, x: "label", y: "score" }),
        text(rows, {
          dy: -20,
          fill: "var(--foreground)",
          fontSize: 13,
          fontWeight: 600,
          text: (row) => formatPercent(row.score),
          x: "label",
          y: "score",
        }),
      ],
      scales: {
        x: {
          axis: { ticks: { size: 0 } },
          // No padding: the line runs edge to edge, and the automatic margins
          // still make room for the end labels.
          scale: () => scalePoint().padding(0),
        },
        y: {
          // Every point carries its value, so no y axis: just faint gridlines.
          axis: false,
          grid: true,
          scale: scaleLinear().domain([floor, 100]),
        },
      },
    });
  }, [attempts, selected]);

  if (attempts.length === 1) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-dashed p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <IconFlagFilled className="size-5" />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="font-medium">This attempt is your baseline</p>
          <p className="text-sm text-pretty text-muted-foreground">
            Try again and your score trend will show up here, with every attempt
            compared to the one before.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Chart
      ariaDescription="Score of each attempt on this topic, oldest first. Select a point to see that attempt."
      ariaLabel="Score trend"
      className="text-muted-foreground"
      definition={definition}
      height={240}
      onSelect={(point) => {
        if (point !== null) {
          onSelect(point.datum.n);
        }
      }}
    />
  );
}
