import { IconMicrophoneFilled } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { formatNumber, formatPercent } from "@/lib/format";
import { useSession } from "@/modules/auth/queries/session";
import { rehearsalQueryOptions } from "@/modules/history/queries/rehearsals";
import { AttemptGuide } from "@/modules/rehearsal/components/attempt-guide";
import { AttemptSwitcher } from "@/modules/rehearsal/components/attempt-switcher";
import { ScoreTrend } from "@/modules/rehearsal/components/score-trend";

const routeApi = getRouteApi("/(private)/(app)/rehearsals/$id");

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

// One rehearsal thread: every attempt on a topic, the score trend that picks
// between them, and the picked attempt's guide. The sticky toolbar holds the
// attempt switcher and "Try again" (a session on the same topic and length).
export function RehearsalPage() {
  const { id } = routeApi.useParams();
  const { student } = useSession();
  const { data: rehearsal } = useSuspenseQuery(
    rehearsalQueryOptions(student.id, id)
  );
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  // Deleted since the loader ran (its last attempt was discarded).
  if (rehearsal?.latest === undefined) {
    return <RehearsalNotFound />;
  }

  const { attempts, latest } = rehearsal;
  const minutes = rehearsal.targetSeconds / 60;
  const selected =
    attempts.find((attempt) => attempt.n === search.attempt) ?? latest;
  const scores = attempts.flatMap(({ score }) =>
    score === null ? [] : [score]
  );

  function select(n: number) {
    void navigate({
      replace: true,
      resetScroll: false,
      search: { attempt: n === latest.n ? undefined : n },
    });
  }

  return (
    // Keyed so switching rehearsals starts at the top.
    <main
      className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      key={rehearsal.id}
    >
      {/* Page toolbar: full panel width, stays put while scrolling, so the
          attempt switcher and the action keep their corners and stay in
          reach. */}
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-card/85 px-4 backdrop-blur-md md:px-6">
        <AttemptSwitcher
          attempts={attempts}
          onSelect={select}
          selected={selected.n}
        />
        <Button
          className="shrink-0"
          onPress={() => {
            void navigate({
              search: {
                minutes,
                rehearsal: rehearsal.id,
                topic: rehearsal.topic,
                topicId: rehearsal.topicId ?? undefined,
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
        <header className="flex flex-col gap-3">
          <h1 className="max-w-xl text-4xl leading-none font-semibold text-balance md:text-5xl">
            {rehearsal.topic}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatNumber(minutes)}-minute talk ·{" "}
            {formatNumber(attempts.length)}{" "}
            {attempts.length === 1 ? "attempt" : "attempts"}
            {scores.length > 0 &&
              ` · best ${formatPercent(Math.max(...scores))}`}
          </p>
        </header>

        <ScoreTrend
          attempts={attempts}
          onSelect={select}
          selected={selected.n}
        />

        <AttemptGuide
          attempt={selected}
          key={selected.n}
          minutes={minutes}
          previous={attempts.find((attempt) => attempt.n === selected.n - 1)}
        />
      </div>
    </main>
  );
}
