import { IconMicrophoneFilled } from "@tabler/icons-react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { formatNumber, formatPercent } from "@/lib/format";
import { AttemptGuide } from "@/modules/rehearsal/components/attempt-guide";
import { ScoreTrend } from "@/modules/rehearsal/components/score-trend";

const routeApi = getRouteApi("/(private)/(app)/rehearsals/$id");

// One rehearsal thread: every attempt on a topic, the score trend that picks
// between them, and the picked attempt's guide. "Try again" (in the sticky
// toolbar) starts a session on the same topic and length.
export function RehearsalPage() {
  const rehearsal = routeApi.useLoaderData();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { attempts, latest } = rehearsal;
  const selected =
    attempts.find((attempt) => attempt.n === search.attempt) ?? latest;
  const best = Math.max(...attempts.map((attempt) => attempt.score));

  return (
    // Keyed so switching rehearsals starts at the top.
    <main
      className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      key={rehearsal.id}
    >
      {/* Page toolbar: full panel width, stays put while scrolling, so the
          action always has the same corner and stays in reach. */}
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-card/85 px-4 backdrop-blur-md md:px-6">
        <p className="min-w-0 truncate text-sm text-muted-foreground">
          {formatNumber(rehearsal.minutes)}-minute talk ·{" "}
          {formatNumber(attempts.length)}{" "}
          {attempts.length === 1 ? "attempt" : "attempts"} · best{" "}
          {formatPercent(best)}
        </p>
        <Button
          className="shrink-0"
          onPress={() => {
            void navigate({
              search: {
                minutes: rehearsal.minutes,
                rehearsal: rehearsal.id,
                topic: rehearsal.topic,
              },
              to: "/session",
            });
          }}
        >
          <IconMicrophoneFilled data-icon="inline-start" />
          Try again
        </Button>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-10 md:px-10">
        <header className="flex flex-col gap-4">
          <h1 className="max-w-xl text-4xl leading-none font-semibold text-balance md:text-5xl">
            {rehearsal.topic}
          </h1>
        </header>

        <ScoreTrend
          attempts={attempts}
          onSelect={(n) => {
            void navigate({
              replace: true,
              resetScroll: false,
              search: { attempt: n === latest.n ? undefined : n },
            });
          }}
          selected={selected.n}
        />

        <AttemptGuide
          attempt={selected}
          key={selected.n}
          minutes={rehearsal.minutes}
          previous={attempts.find((attempt) => attempt.n === selected.n - 1)}
        />
      </div>
    </main>
  );
}

export function RehearsalNotFound() {
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex max-w-sm flex-1 flex-col justify-center gap-6 px-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold text-balance">
          Rehearsal not found
        </h1>
        <p className="text-pretty text-muted-foreground">
          It may have been deleted. Pick another one from the sidebar or start a
          new rehearsal.
        </p>
      </div>
      <Button
        onPress={() => {
          void navigate({ to: "/" });
        }}
        size="lg"
      >
        New rehearsal
      </Button>
    </main>
  );
}
