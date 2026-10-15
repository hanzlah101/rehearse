import type { Topic } from "@server/modules/topics/topics.schemas";
import { IconMicrophoneFilled } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import { SpeechModelCard } from "@/modules/analysis/components/speech-model-card";
import {
  ProgressStats,
  ProgressStatsSkeleton,
} from "@/modules/history/components/progress-stats";
import { LengthPicker } from "@/modules/rehearsal/components/length-picker";
import { TopicDialog } from "@/modules/rehearsal/components/topic-dialog";
import {
  loadTargetLength,
  pickTopic,
  saveTargetLength,
} from "@/modules/rehearsal/lib/topics";
import type { TargetLength } from "@/modules/rehearsal/lib/topics";
import { topicsQueryOptions } from "@/modules/rehearsal/queries/topics";

type TopicStartProps = {
  length: TargetLength;
  onLengthChange: (length: TargetLength) => void;
  // Undefined while the topics load: the topic shows as a skeleton and Start
  // waits, while the length can already be picked.
  topics?: Topic[];
};

function TopicStart({ length, onLengthChange, topics }: TopicStartProps) {
  const navigate = useNavigate();
  const [topic, setTopic] = useState<Topic | undefined>(() =>
    topics === undefined ? undefined : pickTopic(topics)
  );

  return (
    <section className="flex flex-col gap-10">
      {topics === undefined ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full md:h-12 xl:h-15" />
            <Skeleton className="h-10 w-2/3 md:h-12 xl:h-15" />
          </div>
          <Skeleton className="h-6 w-full max-w-md" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-primary">
              {topic?.isCustom === true ? "Your topic" : "Suggested topic"}
            </p>
            <TopicDialog current={topic} onSelect={setTopic} topics={topics} />
          </div>
          <h1
            aria-live="polite"
            className="text-4xl leading-none font-semibold text-balance md:text-5xl xl:text-6xl"
          >
            {topic?.title ?? "What will you talk about?"}
          </h1>
          <p className="max-w-lg text-lg text-pretty text-muted-foreground">
            {topic === undefined
              ? "Choose a topic or type your own to get started."
              : `Talk about it for ${formatNumber(length.minutes)} ${length.minutes === 1 ? "minute" : "minutes"}, straight from your head. No notes, no script.`}
          </p>
        </div>
      )}

      <LengthPicker onChange={onLengthChange} value={length} />

      <Button
        aria-label="Start rehearsal"
        className="self-center"
        isDisabled={topic === undefined}
        onPress={() => {
          if (topic === undefined) {
            return;
          }
          void navigate({
            search: {
              minutes: length.minutes,
              topic: topic.title,
              topicId: topic.id,
            },
            to: "/session",
          });
        }}
        size="icon-xl"
      >
        <IconMicrophoneFilled />
      </Button>
    </section>
  );
}

function LoadedTopicStart(props: Omit<TopicStartProps, "topics">) {
  const { data: topics } = useSuspenseQuery(topicsQueryOptions);

  return <TopicStart {...props} topics={topics} />;
}

// Each part loads on its own behind a skeleton, so the page shows at once.
export function NewRehearsalPage() {
  const [length, setLength] = useState<TargetLength>(loadTargetLength);

  function changeLength(next: TargetLength) {
    setLength(next);
    saveTargetLength(next);
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto my-auto flex w-full max-w-2xl flex-col gap-14 px-6 py-14 md:px-10">
        <SpeechModelCard />

        <Suspense
          fallback={
            <TopicStart length={length} onLengthChange={changeLength} />
          }
        >
          <LoadedTopicStart length={length} onLengthChange={changeLength} />
        </Suspense>

        <Suspense fallback={<ProgressStatsSkeleton />}>
          <ProgressStats />
        </Suspense>
      </div>
    </main>
  );
}
