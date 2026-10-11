import { IconMicrophoneFilled } from "@tabler/icons-react";
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

export function NewRehearsalPage() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState(() => pickTopic());
  const [length, setLength] = useState<TargetLength>(loadTargetLength);

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto my-auto flex w-full max-w-2xl flex-col gap-14 px-6 py-14 md:px-10">
        <section className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-primary">{topic.set}</p>
              <TopicDialog current={topic} onSelect={setTopic} />
            </div>
            <h1
              aria-live="polite"
              className="text-4xl leading-none font-semibold text-balance md:text-5xl xl:text-6xl"
            >
              {topic.title}
            </h1>
            <p className="max-w-lg text-lg text-pretty text-muted-foreground">
              Talk about it for {formatNumber(length.minutes)}{" "}
              {length.minutes === 1 ? "minute" : "minutes"}, straight from your
              head. No notes, no script.
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
            onPress={() => {
              void navigate({
                search: {
                  minutes: length.minutes,
                  set: topic.set,
                  topic: topic.title,
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
