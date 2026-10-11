import { IconPencilFilled } from "@tabler/icons-react";
import { useContext } from "react";
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
import {
  Questionnaire,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireSubmit,
} from "@/components/ui/questionnaire";
import { CUSTOM_SET, TOPIC_SET } from "@/modules/rehearsal/lib/topics";
import type { Topic } from "@/modules/rehearsal/lib/topics";

// Mounted only while the dialog is open, so it always starts from the topic
// on screen; nothing changes until Done. Typing in the input answers with your
// own topic instead of a listed one.
function TopicQuestionnaire({
  current,
  onSelect,
}: {
  current: Topic;
  onSelect: (topic: Topic) => void;
}) {
  const dialog = useContext(OverlayTriggerStateContext);
  const isCustom = current.set === CUSTOM_SET;

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const answer = new FormData(event.currentTarget).get("topic");
    const title = typeof answer === "string" ? answer.trim() : "";

    if (title === "") {
      return;
    }

    onSelect({
      set: TOPIC_SET.topics.includes(title) ? TOPIC_SET.name : CUSTOM_SET,
      title,
    });
    dialog?.close();
  }

  return (
    <Questionnaire onSubmit={handleSubmit}>
      <QuestionnaireItem aria-label="Topic" name="topic" required>
        <QuestionnaireChoices>
          {TOPIC_SET.topics.map((topic) => (
            <QuestionnaireChoice
              defaultChecked={!isCustom && topic === current.title}
              key={topic}
              value={topic}
            >
              {topic}
            </QuestionnaireChoice>
          ))}
          <QuestionnaireInput
            aria-label="Your own topic"
            defaultValue={isCustom ? current.title : undefined}
            maxLength={120}
            placeholder="Or type your own topic…"
          />
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>

      <DialogFooter>
        <DialogClose>Cancel</DialogClose>
        <QuestionnaireSubmit>Done</QuestionnaireSubmit>
      </DialogFooter>
    </Questionnaire>
  );
}

export function TopicDialog({
  current,
  onSelect,
}: {
  current: Topic;
  onSelect: (topic: Topic) => void;
}) {
  return (
    <DialogTrigger>
      <Button size="sm" variant="muted">
        <IconPencilFilled data-icon="inline-start" />
        Change topic
      </Button>
      <Dialog>
        <DialogHeader>
          <DialogTitle>Choose a topic</DialogTitle>
          <DialogDescription>
            Pick one from {TOPIC_SET.name}, or type your own.
          </DialogDescription>
        </DialogHeader>
        <TopicQuestionnaire current={current} onSelect={onSelect} />
      </Dialog>
    </DialogTrigger>
  );
}
