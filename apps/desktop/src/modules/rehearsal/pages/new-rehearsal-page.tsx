import type { Topic } from "@server/modules/topics/topics.schemas";
import { IconMicrophoneFilled } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { ProgressStats } from "@/modules/history/components/progress-stats";
import { LengthPicker } from "@/modules/rehearsal/components/length-picker";
import { TopicDialog } from "@/modules/rehearsal/components/topic-dialog";
import {
  loadTargetLength,
  pickTopic,
  saveTargetLength,
} from "@/modules/rehearsal/lib/topics";
import type { TargetLength } from "@/modules/rehearsal/lib/topics";
import { topicsQueryOptions } from "@/modules/rehearsal/queries/topics";

export function NewRehearsalPage() {
  const navigate = useNavigate();
  const { data: topics } = useSuspenseQuery(topicsQueryOptions);
  const [topic, setTopic] = useState<Topic | undefined>(() =>
    pickTopic(topics)
  );
  const [length, setLength] = useState<TargetLength>(loadTargetLength);

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto my-auto flex w-full max-w-2xl flex-col gap-14 px-6 py-14 md:px-10">
        <section className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-primary">
                {topic?.isCustom === true ? "Your topic" : "Suggested topic"}
              </p>
              <TopicDialog
                current={topic}
                onSelect={setTopic}
                topics={topics}
              />
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

          <LengthPicker
            onChange={(next) => {
              setLength(next);
              saveTargetLength(next);
            }}
            value={length}
          />

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

        <ProgressStats />
      </div>
    </main>
  );
}
