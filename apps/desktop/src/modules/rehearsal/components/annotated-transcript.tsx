import {
  IconArrowNarrowRight,
  IconPlayerPauseFilled,
} from "@tabler/icons-react";
import { cn } from "cn";
import type * as React from "react";
import { useId, useState } from "react";
import {
  Button,
  Pressable,
  ToggleButton,
  ToggleButtonGroup,
} from "react-aria-components";
import type { Key } from "react-aria-components";

import {
  Popover,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatNumber } from "@/lib/format";
import { countOf } from "@/modules/rehearsal/lib/transcript";
import type { Mark, MarkKind } from "@/modules/rehearsal/lib/transcript";

// Marks of the transcript (the better version has its own: changed, emphasis).
type HighlightKind = Exclude<MarkKind, "text" | "changed" | "emphasis">;

// One look per category, shared by the legend swatch and the highlight.
const CATEGORIES: {
  className: string;
  kind: HighlightKind;
  label: string;
  swatch: string;
}[] = [
  {
    className:
      "rounded-md bg-chart-3/20 px-1 font-medium text-foreground ring-1 ring-chart-3/50 ring-inset data-hovered:bg-chart-3/35",
    kind: "filler",
    label: "Fillers",
    swatch: "rounded-sm bg-chart-3/30 ring-1 ring-chart-3/60 ring-inset",
  },
  {
    className:
      "rounded-sm bg-chart-5/10 underline decoration-chart-5 decoration-2 underline-offset-4 data-hovered:bg-chart-5/20",
    kind: "repetition",
    label: "Repetition",
    swatch: "border-b-2 border-chart-5 bg-chart-5/15",
  },
  {
    className:
      "rounded-sm underline decoration-destructive decoration-wavy underline-offset-4 data-hovered:bg-destructive/10",
    kind: "grammar",
    label: "Grammar",
    swatch: "border-b-2 border-dotted border-destructive",
  },
  {
    className:
      "rounded-sm underline decoration-primary decoration-dotted decoration-2 underline-offset-4 data-hovered:bg-primary/10",
    kind: "vocabulary",
    label: "Vocabulary",
    swatch: "border-b-2 border-dotted border-primary",
  },
  {
    className:
      "mx-0.5 inline-flex items-center gap-1 rounded-full bg-muted px-1.5 align-middle text-xs font-medium text-muted-foreground tabular-nums ring-1 ring-border ring-inset data-hovered:text-foreground dark:bg-input/30",
    kind: "pause",
    label: "Long pauses",
    swatch: "rounded-full bg-muted ring-1 ring-border ring-inset",
  },
  {
    className:
      "mx-0.5 inline-flex items-center gap-1 rounded-full bg-chart-2/15 px-1.5 align-middle text-xs font-medium text-chart-2 ring-1 ring-chart-2/40 ring-inset data-hovered:bg-chart-2/25",
    kind: "suggested",
    label: "Add a pause",
    swatch: "rounded-full bg-chart-2/25 ring-1 ring-chart-2/50 ring-inset",
  },
];

const MARK_BASE =
  "cursor-default outline-hidden transition-colors duration-150 data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-ring data-focus-visible:outline-solid";

const PUNCTUATION = /^[.,;:!?)]+/u;

// Highlights are buttons, which never break inside a line, so a period after
// one could wrap on its own. Move that punctuation onto the highlight.
function gluePunctuation(paragraph: Mark[]) {
  return paragraph.map((mark, index) => {
    const previous = paragraph[index - 1];
    const next = paragraph[index + 1];
    const trailing =
      mark.kind !== "text" && next?.kind === "text"
        ? (PUNCTUATION.exec(next.text)?.[0] ?? "")
        : "";

    return {
      mark:
        mark.kind === "text" &&
        previous !== undefined &&
        previous.kind !== "text"
          ? { kind: "text" as const, text: mark.text.replace(PUNCTUATION, "") }
          : mark,
      trailing,
    };
  });
}

function Explanation({
  mark,
  paragraphs,
}: {
  mark: Extract<Mark, { kind: HighlightKind }>;
  paragraphs: Mark[][];
}) {
  switch (mark.kind) {
    case "filler": {
      const count = countOf(paragraphs, "filler", mark.text);

      return (
        <>
          <PopoverTitle>“{mark.text.toLowerCase()}” is a filler</PopoverTitle>
          <PopoverDescription>
            {count > 1 ? `You said it ${formatNumber(count)} times here. ` : ""}
            Pause silently instead: a short pause sounds confident, a filler
            sounds unsure.
          </PopoverDescription>
        </>
      );
    }
    case "repetition": {
      const count = countOf(paragraphs, "repetition", mark.text);

      return (
        <>
          <PopoverTitle>
            “{mark.text.toLowerCase()}”, {formatNumber(count)} times
          </PopoverTitle>
          <PopoverDescription>
            Repeating the same link makes a talk sound like a list. Vary it
            (next, after that, finally) or drop it.
          </PopoverDescription>
        </>
      );
    }
    case "grammar":
    case "vocabulary": {
      return (
        <>
          <PopoverTitle>
            {mark.kind === "grammar" ? "Grammar" : "A stronger choice"}
          </PopoverTitle>
          <p className="text-muted-foreground line-through decoration-destructive/60">
            {mark.text}
          </p>
          <p className="flex items-start gap-1.5 font-medium">
            <IconArrowNarrowRight className="mt-0.5 size-4 shrink-0 text-primary" />
            {mark.fix}
          </p>
          <PopoverDescription>{mark.why}</PopoverDescription>
        </>
      );
    }
    case "pause": {
      return (
        <>
          <PopoverTitle>
            {formatNumber(mark.seconds)}s silence mid-thought
          </PopoverTitle>
          <PopoverDescription>
            A long gap here sounds like you lost your place. Finish the sentence
            first, then pause.
          </PopoverDescription>
        </>
      );
    }
    case "suggested": {
      return (
        <>
          <PopoverTitle>Add a short pause here</PopoverTitle>
          <PopoverDescription>{mark.why}</PopoverDescription>
        </>
      );
    }
    default: {
      return null;
    }
  }
}

function Highlight({
  isShown,
  mark,
  paragraphs,
}: {
  isShown: boolean;
  mark: Mark;
  paragraphs: Mark[][];
}) {
  if (
    mark.kind === "text" ||
    mark.kind === "changed" ||
    mark.kind === "emphasis"
  ) {
    return mark.text;
  }

  const category = CATEGORIES.find((item) => item.kind === mark.kind);

  if (!isShown || category === undefined) {
    // Hidden categories read as plain speech; pause markers disappear.
    return "text" in mark ? mark.text : null;
  }

  return (
    <PopoverTrigger>
      <Button className={cn(MARK_BASE, category.className)}>
        {mark.kind === "pause" && (
          <>
            <IconPlayerPauseFilled className="size-3" />
            {formatNumber(mark.seconds)}s
          </>
        )}
        {mark.kind === "suggested" && (
          <>
            <IconPlayerPauseFilled className="size-3" />
            pause
          </>
        )}
        {"text" in mark && mark.text}
      </Button>
      <Popover>
        <Explanation mark={mark} paragraphs={paragraphs} />
      </Popover>
    </PopoverTrigger>
  );
}

// What the student said, with every finding highlighted in place. Chips above
// show or hide each category; each highlight explains itself on click.
export function AnnotatedTranscript({ paragraphs }: { paragraphs: Mark[][] }) {
  const titleId = useId();
  const marks = paragraphs.flat();
  const categories = CATEGORIES.map((category) => ({
    ...category,
    count: marks.filter((mark) => mark.kind === category.kind).length,
  })).filter((category) => category.count > 0);
  const [shown, setShown] = useState<Set<Key>>(
    () => new Set(CATEGORIES.map((category) => category.kind))
  );

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h3 id={titleId} className="text-lg font-semibold">
          What you said
        </h3>
        <p className="text-sm text-pretty text-muted-foreground">
          Click a highlight to see why it matters and how to fix it.
        </p>
      </div>

      <ToggleButtonGroup
        aria-label="Show highlights"
        className="flex flex-wrap gap-1.5"
        onSelectionChange={setShown}
        selectedKeys={shown}
        selectionMode="multiple"
      >
        {categories.map((category) => (
          <ToggleButton
            className="group/chip flex h-7 cursor-default items-center gap-2 rounded-full px-2.5 text-xs font-medium text-muted-foreground ring-1 ring-border outline-hidden transition-colors duration-150 select-none ring-inset data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-ring data-focus-visible:outline-solid data-hovered:text-foreground data-selected:bg-card data-selected:text-foreground data-selected:shadow-xs dark:data-selected:bg-input/30"
            id={category.kind}
            key={category.kind}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-3 shrink-0 opacity-40 transition-opacity group-data-selected/chip:opacity-100",
                category.swatch
              )}
            />
            {category.label}
            <span className="tabular-nums opacity-70">{category.count}</span>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <div className="flex max-w-prose flex-col gap-4 text-base leading-8 text-pretty">
        {paragraphs.map((paragraph, index) => (
          // Paragraphs never reorder, so the index is a stable key.
          // oxlint-disable-next-line react/no-array-index-key
          <p key={index}>
            {gluePunctuation(paragraph).map(({ mark, trailing }, markIndex) => (
              <span
                className={trailing === "" ? undefined : "whitespace-nowrap"}
                // oxlint-disable-next-line react/no-array-index-key
                key={markIndex}
              >
                <Highlight
                  isShown={shown.has(mark.kind)}
                  mark={mark}
                  paragraphs={paragraphs}
                />
                {trailing}
              </span>
            ))}
          </p>
        ))}
      </div>
    </section>
  );
}

// Changes and stresses can be whole sentences, so they're inline spans that
// wrap like text (a button can't), tinted only around the words.
const INLINE_CUE =
  "cursor-default rounded-sm box-decoration-clone outline-hidden transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid";

function InlineCue({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <Pressable>
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an inline trigger that wraps; a <button> can't */}
      <span className={cn(INLINE_CUE, className)} role="button" tabIndex={0}>
        {children}
      </span>
    </Pressable>
  );
}

const PAUSE_CHIP =
  "mx-0.5 inline-flex items-center gap-1 rounded-full bg-chart-2/15 px-1.5 align-middle text-xs leading-5 font-medium text-chart-2 tabular-nums ring-1 ring-chart-2/40 ring-inset";

function seconds(value: number) {
  return `${formatNumber(value)} ${value === 1 ? "second" : "seconds"}`;
}

// One cue of the better version: a pause to take, a word to stress, or
// changed wording. Each explains itself on click.
function Cue({ mark }: { mark: Mark }) {
  if (mark.kind === "pause") {
    return (
      <PopoverTrigger>
        <Button
          className={cn(MARK_BASE, PAUSE_CHIP, "data-hovered:bg-chart-2/25")}
        >
          <IconPlayerPauseFilled aria-hidden="true" className="size-3" />
          <span aria-hidden="true">{formatNumber(mark.seconds)}s</span>
          <span className="sr-only">Pause {seconds(mark.seconds)}</span>
        </Button>
        <Popover>
          <PopoverTitle>Pause for {seconds(mark.seconds)}</PopoverTitle>
          {mark.why !== "" && (
            <PopoverDescription>{mark.why}</PopoverDescription>
          )}
        </Popover>
      </PopoverTrigger>
    );
  }

  if (mark.kind === "emphasis") {
    return (
      <PopoverTrigger>
        <InlineCue className="font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:bg-primary/10">
          {mark.text}
        </InlineCue>
        <Popover>
          <PopoverTitle>Stress “{mark.text}”</PopoverTitle>
          {mark.why !== "" && (
            <PopoverDescription>{mark.why}</PopoverDescription>
          )}
        </Popover>
      </PopoverTrigger>
    );
  }

  if (mark.kind === "changed") {
    if (mark.said === "" && mark.why === "") {
      return (
        <mark className="rounded-sm bg-primary/10 box-decoration-clone px-0.5 text-foreground dark:bg-primary/20">
          {mark.text}
        </mark>
      );
    }
    return (
      <PopoverTrigger>
        <InlineCue className="bg-primary/10 px-0.5 text-foreground underline decoration-primary/40 underline-offset-4 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30">
          {mark.text}
        </InlineCue>
        <Popover>
          <PopoverTitle>Changed</PopoverTitle>
          {mark.said !== "" && (
            <p className="text-muted-foreground line-through decoration-destructive/60">
              {mark.said}
            </p>
          )}
          <p className="flex items-start gap-1.5 font-medium">
            <IconArrowNarrowRight className="mt-0.5 size-4 shrink-0 text-primary" />
            {mark.text}
          </p>
          {mark.why !== "" && (
            <PopoverDescription>{mark.why}</PopoverDescription>
          )}
        </Popover>
      </PopoverTrigger>
    );
  }

  return "text" in mark ? mark.text : null;
}

// The same talk said better, as a script to read aloud: changed wording is
// tinted, pause chips say where to stop and for how long, underlined words
// are the ones to stress. Every cue explains itself on click.
export function BetterVersion({ paragraphs }: { paragraphs: Mark[][] }) {
  const titleId = useId();
  const marks = paragraphs.flat();
  const pauses = marks.filter((mark) => mark.kind === "pause").length;
  const stresses = marks.filter((mark) => mark.kind === "emphasis").length;
  const changes = marks.filter((mark) => mark.kind === "changed").length;

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-5 rounded-2xl bg-primary/5 p-6 ring-1 ring-primary/15 ring-inset md:p-8 dark:bg-primary/10"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 id={titleId} className="text-lg font-semibold">
            A better version
          </h3>
          <p className="text-sm text-pretty text-muted-foreground">
            Same ideas, said the way a confident speaker would. Read it aloud
            following the cues, then try again in your own words. Click any cue
            to see why.
          </p>
        </div>
        <ul
          aria-label="Cues"
          className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground"
        >
          <li className="flex items-center gap-1.5">
            <span className="rounded-sm bg-primary/10 px-1 text-foreground underline decoration-primary/40 underline-offset-4 dark:bg-primary/20">
              word
            </span>
            {formatNumber(changes)} {changes === 1 ? "change" : "changes"}
          </li>
          <li className="flex items-center gap-1.5">
            <span className={PAUSE_CHIP}>
              <IconPlayerPauseFilled aria-hidden="true" className="size-3" />
            </span>
            {formatNumber(pauses)} {pauses === 1 ? "pause" : "pauses"} to take
          </li>
          <li className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4">
              word
            </span>
            {formatNumber(stresses)} {stresses === 1 ? "word" : "words"} to
            stress
          </li>
        </ul>
      </div>
      <div className="flex max-w-prose flex-col gap-4 text-base leading-8 text-pretty">
        {paragraphs.map((paragraph, index) => (
          // oxlint-disable-next-line react/no-array-index-key
          <p key={index}>
            {gluePunctuation(paragraph).map(({ mark, trailing }, markIndex) => (
              <span
                className={trailing === "" ? undefined : "whitespace-nowrap"}
                // oxlint-disable-next-line react/no-array-index-key
                key={markIndex}
              >
                <Cue mark={mark} />
                {trailing}
              </span>
            ))}
          </p>
        ))}
      </div>
    </section>
  );
}
