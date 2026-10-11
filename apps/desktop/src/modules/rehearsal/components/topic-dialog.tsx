import { createTopicInputSchema } from "@server/modules/topics/topics.schemas";
import type { Topic } from "@server/modules/topics/topics.schemas";
import { IconPencilFilled } from "@tabler/icons-react";
import { useContext, useState } from "react";
import type * as React from "react";
import { OverlayTriggerStateContext } from "react-aria-components";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormAlert } from "@/components/ui/form";
import {
  Questionnaire,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
} from "@/components/ui/questionnaire";
import { useCreateTopic } from "@/modules/rehearsal/actions/create-topic";

// Mounted only while the dialog is open, so it always starts from the topic on
// screen; nothing changes until Done. Picking a listed topic (or typing one
// that matches a listed title) applies it at once; a new title is saved to the
// server first, and the dialog stays open with an error if that fails.
function TopicQuestionnaire({
  current,
  onSelect,
  topics,
}: {
  current: Topic | undefined;
  onSelect: (topic: Topic) => void;
  topics: Topic[];
}) {
  const dialog = useContext(OverlayTriggerStateContext);
  const createTopic = useCreateTopic();
  const [inputError, setInputError] = useState<string | null>(null);

  function apply(topic: Topic) {
    onSelect(topic);
    dialog?.close();
  }

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const answer = new FormData(event.currentTarget).get("topic");
    const value = typeof answer === "string" ? answer.trim() : "";
    const listed =
      topics.find((topic) => topic.id === value) ??
      topics.find((topic) => topic.title.toLowerCase() === value.toLowerCase());

    if (listed !== undefined) {
      apply(listed);
      return;
    }

    const parsed = createTopicInputSchema.safeParse({ title: value });
    if (!parsed.success) {
      setInputError(parsed.error.issues[0]?.message ?? null);
      return;
    }

    setInputError(null);
    createTopic.mutate(parsed.data, { onSuccess: apply });
  }

  return (
    <Questionnaire onSubmit={handleSubmit}>
      <FormAlert mutation={createTopic} />

      <QuestionnaireItem aria-label="Topic" name="topic" required>
        {/* Scrolls edge to edge (out through the dialog's padding), so the
            scrollbar sits at the dialog's side, not over the rows. shadcn's
            scroll-fade-y fades whichever edge has more to scroll. */}
        <div className="-mx-6 -my-1 max-h-80 scroll-fade-y overflow-y-auto px-6 py-1">
          <QuestionnaireChoices>
            {topics.map((topic) => (
              <QuestionnaireChoice
                defaultChecked={topic.id === current?.id}
                key={topic.id}
                value={topic.id}
              >
                {topic.title}
              </QuestionnaireChoice>
            ))}
          </QuestionnaireChoices>
        </div>
        <QuestionnaireInput
          aria-label="Your own topic"
          maxLength={120}
          onChange={() => {
            setInputError(null);
          }}
          placeholder="Or type your own topic…"
        />
        {inputError !== null && (
          <p className="text-sm text-destructive" role="alert">
            {inputError}
          </p>
        )}
        <QuestionnaireError />
      </QuestionnaireItem>

      <DialogFooter>
        <DialogClose isDisabled={createTopic.isPending}>Cancel</DialogClose>
        <Button isLoading={createTopic.isPending} type="submit">
          Done
        </Button>
      </DialogFooter>
    </Questionnaire>
  );
}

export function TopicDialog({
  current,
  onSelect,
  topics,
}: {
  current: Topic | undefined;
  onSelect: (topic: Topic) => void;
  topics: Topic[];
}) {
  return (
    <DialogTrigger>
      <Button size="sm" variant="muted">
        <IconPencilFilled data-icon="inline-start" />
        {current === undefined ? "Choose a topic" : "Change topic"}
      </Button>
      <Dialog>
        <DialogHeader>
          <DialogTitle>Choose a topic</DialogTitle>
          <DialogDescription>
            Pick one, or type your own. Topics you add are saved for next time.
          </DialogDescription>
        </DialogHeader>
        <TopicQuestionnaire
          current={current}
          onSelect={onSelect}
          topics={topics}
        />
      </Dialog>
    </DialogTrigger>
  );
}
