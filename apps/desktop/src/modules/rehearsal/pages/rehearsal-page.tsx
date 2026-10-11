import { IconMicrophoneFilled } from "@tabler/icons-react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { formatNumber, formatPercent } from "@/lib/format";
import { AttemptGuide } from "@/modules/rehearsal/components/attempt-guide";
import { ScoreTrend } from "@/modules/rehearsal/components/score-trend";

const routeApi = getRouteApi("/(private)/(app)/rehearsals/$id");

// One rehearsal thread: every attempt on a topic, the score trend that picks
// between them, and the picked attempt's guide. "Try again" starts a session
// on the same topic and length.
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
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-12 md:px-10">
        <header className="flex flex-col gap-4">
          <p className="text-sm font-medium text-primary">{rehearsal.set}</p>
          <h1 className="max-w-xl text-4xl leading-none font-semibold text-balance md:text-5xl">
            {rehearsal.topic}
          </h1>
          {/* The action shares a row with the summary, under the title, so it
              sits in the same place whatever the title's length. */}
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <p className="text-pretty text-muted-foreground">
              {formatNumber(rehearsal.minutes)}-minute talk.{" "}
              {formatNumber(attempts.length)}{" "}
              {attempts.length === 1 ? "attempt" : "attempts"}, best{" "}
              {formatPercent(best)}.
              {attempts.length === 1 && " Try again to start your trend."}
            </p>
            <Button
              onPress={() => {
                void navigate({
                  search: {
                    minutes: rehearsal.minutes,
                    rehearsal: rehearsal.id,
                    set: rehearsal.set,
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
