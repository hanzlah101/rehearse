import type { FeedbackResult } from "@server/modules/feedback/feedback.schemas";

import { fillersPerMinute, TARGET_WPM } from "@/modules/analysis/lib/metrics";
import type { Metrics } from "@/modules/analysis/lib/metrics";
import { SUBSCORES } from "@/modules/rehearsal/lib/feedback";
import type {
  AttemptFeedback,
  Subscore,
} from "@/modules/rehearsal/lib/feedback";

// Turns the local measurements and the server's review into what the report
// shows: transcript markup (transcript.ts), a better version, subscores and
// the score (PLAN §4.3). Every number is computed here.

const WEIGHTS: Record<Subscore, number> = {
  Delivery: 0.05,
  Flow: 0.15,
  Fluency: 0.25,
  Grammar: 0.2,
  Pace: 0.1,
  Variety: 0.1,
  Vocabulary: 0.15,
};

const PAUSE_SECONDS = { long: 1.5, medium: 1, short: 0.5 } as const;

// Sentences per paragraph in the transcript; a long pause also starts one.
const PARAGRAPH_SENTENCES = 4;
const PARAGRAPH_PAUSE_SECONDS = 2;

function clamp(value: number) {
  return Math.round(Math.min(100, Math.max(0, value)));
}

// Markup uses < > | as delimiters; keep them out of the content.
function escapeText(text: string) {
  return text.replaceAll("<", "‹").replaceAll(">", "›");
}

function escapeBody(text: string) {
  return escapeText(text).replaceAll("|", "/").trim();
}

function rubricToScore(rubric: number) {
  return 20 + ((rubric - 1) / 4) * 80;
}

type Span = { end: number; open: string; start: number };

function findQuote(text: string, quote: string) {
  const at = text.toLowerCase().indexOf(quote.toLowerCase().trim());
  return at === -1 ? null : { end: at + quote.trim().length, start: at };
}

function overlaps(span: { end: number; start: number }, taken: Span[]) {
  return taken.some(
    (other) => span.start < other.end && other.start < span.end
  );
}

function escapeRegExp(text: string) {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
}

// The confirmed fillers by word: always-fillers plus the ambiguous words the
// LLM confirmed ("like" as hesitation, not "I like it").
export function confirmedFillers(metrics: Metrics, result: FeedbackResult) {
  const confirmed = new Set(
    result.language.fillerConfirmations
      .filter(({ isFiller }) => isFiller)
      .map(({ id }) => id)
  );
  // One group per filler: a single word, or a phrase like "you know".
  const groups = [
    ...metrics.fillers.map((word) => [word]),
    ...metrics.fillerCandidates
      .filter(({ id }) => confirmed.has(id))
      .map(({ words }) => words),
  ];

  return { count: groups.length, groups, words: new Set(groups.flat()) };
}

type SentenceLayout = {
  // Where each word sits in the sentence text: [start, end of the word,
  // end of its letters (before trailing punctuation)].
  offsets: Map<number, [number, number, number]>;
  text: string;
};

function layout(metrics: Metrics, sentence: Metrics["sentences"][number]) {
  const offsets: SentenceLayout["offsets"] = new Map();
  let text = "";

  const [first, last] = sentence.words;
  for (let index = first; index <= last; index += 1) {
    const word = metrics.words[index];
    if (word === undefined) {
      continue;
    }
    if (text !== "") {
      text += " ";
    }
    const start = text.length;
    text += word.text;
    const core = word.text.replace(/[.,!?;:"”)]+$/u, "");
    offsets.set(index, [start, text.length, start + core.length]);
  }

  return { offsets, text };
}

// Replaces each span with its tag (the tag carries the quoted text) and adds
// the inserts (pause markers) between words.
function render(
  text: string,
  spans: Span[],
  inserts: { at: number; markup: string }[]
) {
  const events = [
    ...spans.map((span) => ({ ...span, markup: `${span.open}>` })),
    ...inserts.map((insert) => ({
      end: insert.at,
      markup: insert.markup,
      start: insert.at,
    })),
  ].toSorted((a, b) => a.start - b.start || a.end - b.end);
  let output = "";
  let last = 0;

  for (const event of events) {
    if (event.start >= last) {
      output += escapeText(text.slice(last, event.start)) + event.markup;
      last = event.end;
    }
  }

  return output + escapeText(text.slice(last));
}

// Joins rendered sentences into paragraphs: a new one after a few sentences
// or a long pause, but only where a real sentence ends (an over-long run
// split in two stays together).
function groupParagraphs(metrics: Metrics, rendered: string[]) {
  const paragraphs: string[][] = [[]];

  for (const [index, sentence] of metrics.sentences.entries()) {
    const text = rendered[index] ?? "";
    const current = paragraphs.at(-1) ?? [];
    if (text !== "") {
      current.push(text);
    }
    const lastWord = metrics.words[sentence.words[1]];
    const isRealEnd = /[.!?]["”')\]]*$/u.test(lastWord?.text ?? "");
    const isLongPause = (lastWord?.pauseAfter ?? 0) >= PARAGRAPH_PAUSE_SECONDS;
    if (
      isRealEnd &&
      (current.length >= PARAGRAPH_SENTENCES ||
        (current.length >= 2 && isLongPause))
    ) {
      paragraphs.push([]);
    }
  }

  return paragraphs
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => paragraph.join(" "))
    .join("\n\n");
}

function buildTranscript(
  metrics: Metrics,
  result: FeedbackResult,
  fillerGroups: number[][]
) {
  const { language } = result;
  const selectedPauses = new Map(
    language.suggestedPauses.map((pause) => [pause.id, pause])
  );
  const rendered: string[] = [];

  for (const sentence of metrics.sentences) {
    const { offsets, text } = layout(metrics, sentence);
    const spans: Span[] = [];
    const take = (
      range: { end: number; start: number } | null,
      open: string
    ) => {
      if (
        range !== null &&
        range.end > range.start &&
        !overlaps(range, spans)
      ) {
        spans.push({ ...range, open });
      }
    };

    for (const item of language.grammar.filter(({ i }) => i === sentence.i)) {
      take(
        findQuote(text, item.quote),
        `<g:${escapeBody(item.quote)}|${escapeBody(item.fix)}|${escapeBody(item.why)}`
      );
    }
    for (const item of language.vocabulary.filter(
      ({ i }) => i === sentence.i
    )) {
      take(
        findQuote(text, item.quote),
        `<v:${escapeBody(item.quote)}|${escapeBody(item.better)}|${escapeBody(item.why)}`
      );
    }
    for (const group of fillerGroups) {
      const first = offsets.get(group[0] ?? -1);
      const last = offsets.get(group.at(-1) ?? -1);
      if (first !== undefined && last !== undefined) {
        const range = { end: last[2], start: first[0] };
        take(range, `<f:${escapeBody(text.slice(range.start, range.end))}`);
      }
    }
    for (const { phrase } of language.repetition) {
      const pattern = new RegExp(
        String.raw`(?<![\p{L}\p{N}])${escapeRegExp(phrase.trim())}(?![\p{L}\p{N}])`,
        "giu"
      );
      for (const match of text.matchAll(pattern)) {
        take(
          { end: match.index + match[0].length, start: match.index },
          `<r:${escapeBody(match[0])}`
        );
      }
    }

    const inserts: { at: number; markup: string }[] = [];
    for (const pause of metrics.longPauses) {
      const offset = offsets.get(pause.word);
      if (offset !== undefined && pause.i === sentence.i) {
        inserts.push({ at: offset[1], markup: ` <p:${pause.seconds}>` });
      }
    }
    for (const candidate of metrics.pauseCandidates) {
      const selected = selectedPauses.get(candidate.id);
      const offset = offsets.get(candidate.word);
      if (selected !== undefined && offset !== undefined) {
        inserts.push({
          at: offset[0],
          markup: `<s:${escapeBody(selected.why)}> `,
        });
      }
    }

    rendered.push(render(text, spans, inserts));
  }

  return groupParagraphs(metrics, rendered);
}

function capitalize(text: string) {
  // Skip leading marks (a pause chip) to the first letter.
  return text.replace(
    /^(?<lead>(?:\s*<[^>]*>)*\s*)(?<letter>\p{Ll})/u,
    (_, lead: string, letter: string) => lead + letter.toUpperCase()
  );
}

// The same talk with the fixes applied: rephrased sentences, grammar and
// word upgrades marked as changed, fillers and stutters removed, suggested
// pauses shown as deliberate pauses to take.
type Pause = { seconds: number; why: string };

const FILLER_PAUSE_SECONDS = 0.5;
const SENTENCE_PAUSE_SECONDS = 0.5;

function pauseMarkup({ seconds, why }: Pause) {
  return `<p:${seconds}|${escapeBody(why)}>`;
}

const PAUSE_RUN = /<p:[^>]*>(?:\s*<p:[^>]*>)+/gu;

// Pauses that end up side by side (a removed filler next to a picked pause)
// become one: the longest, the first of equals.
function pauseSeconds(markup: string) {
  return Number(/^<p:(?<seconds>[\d.]+)/u.exec(markup)?.groups?.seconds ?? 0);
}

function collapsePauses(markup: string) {
  return markup.replaceAll(PAUSE_RUN, (run) => {
    let best = "";
    for (const pause of run.match(/<p:[^>]*>/gu) ?? []) {
      if (best === "" || pauseSeconds(pause) > pauseSeconds(best)) {
        best = pause;
      }
    }
    return best;
  });
}

function endsRealSentence(
  metrics: Metrics,
  sentence: Metrics["sentences"][number]
) {
  return /[.!?]["”')\]]*$/u.test(metrics.words[sentence.words[1]]?.text ?? "");
}

// Whether a filler sits at a natural break: the start of the sentence, next
// to punctuation, or before a capitalised word (a new sentence the
// recogniser didn't split off). "I" doesn't count: it's always capitalised.
function isAtBreak(
  text: string,
  first: [number, number, number],
  last: [number, number, number]
) {
  const before = text.slice(0, first[0]).trimEnd();
  const after = text.slice(last[1]).trimStart();

  return (
    before === "" ||
    /[,.;:!?\u2013\u2014-]$/u.test(before) ||
    last[1] > last[2] ||
    /^(?!I\b|I['\u2019])\p{Lu}/u.test(after)
  );
}

// The silent pause that replaces a filler at a natural break, unless a pause
// the LLM picked right after it already covers the spot. Mid-phrase fillers
// ("I don't uh like the food") just go: a pause there would break the phrase.
function fillerPause(
  text: string,
  offsets: SentenceLayout["offsets"],
  group: number[],
  pauseByWord: Map<number, Pause>
) {
  const first = offsets.get(group[0] ?? -1);
  const last = offsets.get(group.at(-1) ?? -1);
  if (
    first === undefined ||
    last === undefined ||
    pauseByWord.has((group.at(-1) ?? -1) + 1) ||
    !isAtBreak(text, first, last)
  ) {
    return "";
  }
  const said = text.slice(first[0], last[2]).toLowerCase();
  return ` ${pauseMarkup({
    seconds: FILLER_PAUSE_SECONDS,
    why: `Pause silently instead of “${said}”. A beat of silence sounds sure; a filler sounds unsure.`,
  })} `;
}

// The same talk with the fixes applied, as a script to read aloud: changed
// wording (what was said and why), fillers and stutters removed (a silent
// pause where a filler was at a natural break), the pauses to take with their reasons, and the
// words to stress.
function betterSentence(
  metrics: Metrics,
  result: FeedbackResult,
  sentence: Metrics["sentences"][number],
  fillerGroups: number[][],
  pauseByWord: Map<number, Pause>
) {
  const { language } = result;
  const { offsets, text } = layout(metrics, sentence);
  const edits: { end: number; markup: string; start: number }[] = [];
  const edit = (
    range: { end: number; start: number } | null,
    markup: string
  ) => {
    if (
      range !== null &&
      range.end > range.start &&
      !overlaps(
        range,
        edits.map((item) => ({ ...item, open: "" }))
      )
    ) {
      edits.push({ ...range, markup });
    }
  };
  const change = (quote: string, better: string, why: string) => {
    edit(
      findQuote(text, quote),
      `<c:${escapeBody(better)}|${escapeBody(quote)}|${escapeBody(why)}>`
    );
  };

  for (const item of language.rephrasings.filter(({ i }) => i === sentence.i)) {
    change(item.quote, item.better, item.why);
  }
  for (const item of language.grammar.filter(({ i }) => i === sentence.i)) {
    change(item.quote, item.fix, item.why);
  }
  for (const item of language.vocabulary.filter(({ i }) => i === sentence.i)) {
    change(item.quote, item.better, item.why);
  }
  for (const item of language.emphasis.filter(({ i }) => i === sentence.i)) {
    const range = findQuote(text, item.quote);
    if (range !== null) {
      edit(
        range,
        `<e:${escapeBody(text.slice(range.start, range.end))}|${escapeBody(item.why)}>`
      );
    }
  }

  // Fillers ("um", "you know") and stutters ("the the") go, with their
  // trailing punctuation; between two commas the first comma goes too
  // ("we, you know, tried" → "we tried"). A filler at a break leaves a
  // silent pause.
  const remove = (from: number, to: number, markup: string) => {
    const first = offsets.get(from);
    const last = offsets.get(to);
    if (first === undefined || last === undefined) {
      return;
    }
    const before = text.slice(0, first[0]).trimEnd();
    const start =
      text[last[1] - 1] === "," && before.endsWith(",")
        ? before.length - 1
        : first[0];
    edit({ end: last[1], start }, markup);
  };
  for (const group of fillerGroups) {
    remove(
      group[0] ?? -1,
      group.at(-1) ?? -1,
      fillerPause(text, offsets, group, pauseByWord)
    );
  }
  let previous = "";
  const [firstWord, lastWord] = sentence.words;
  for (let index = firstWord; index <= lastWord; index += 1) {
    const word = metrics.words[index];
    const isStutter =
      word !== undefined &&
      word.normalized !== "" &&
      word.normalized === previous;
    previous = word?.normalized ?? "";
    if (isStutter) {
      remove(index, index, "");
    }
  }

  const inserts = [...pauseByWord].flatMap(([word, pause]) => {
    const offset = offsets.get(word);
    const isEdited =
      offset !== undefined &&
      edits.some((item) => offset[0] > item.start && offset[0] < item.end);
    return offset === undefined || isEdited
      ? []
      : [{ at: offset[0], markup: `${pauseMarkup(pause)} ` }];
  });

  const events = [
    ...edits.map((item) => ({
      at: item.start,
      end: item.end,
      markup: item.markup,
    })),
    ...inserts.map((item) => ({
      at: item.at,
      end: item.at,
      markup: item.markup,
    })),
  ].toSorted((a, b) => a.at - b.at || a.end - b.end);
  let output = "";
  let last = 0;
  for (const event of events) {
    if (event.at >= last) {
      output += escapeText(text.slice(last, event.at)) + event.markup;
      last = event.end;
    }
  }
  output += escapeText(text.slice(last));

  const cleaned = output
    .replaceAll(/\s+/gu, " ")
    .replaceAll(/\s+(?<mark>[,.!?;:])/gu, "$<mark>")
    .replaceAll(/^[\s,;:]+/gu, "")
    .replaceAll(/,\s*,/gu, ",")
    .trim();
  // A sentence that began with a capital keeps one after a removed filler;
  // the second half of a split run stays lowercase.
  return /^\p{Lu}/u.test(text) ? capitalize(cleaned) : cleaned;
}

function buildBetter(
  metrics: Metrics,
  result: FeedbackResult,
  fillerGroups: number[][]
) {
  const pauseByWord = new Map<number, Pause>();
  const selected = new Map(
    result.language.suggestedPauses.map((pause) => [pause.id, pause])
  );
  for (const candidate of metrics.pauseCandidates) {
    const pause = selected.get(candidate.id);
    if (pause !== undefined) {
      pauseByWord.set(candidate.word, {
        seconds: PAUSE_SECONDS[pause.length],
        why: pause.why,
      });
    }
  }

  const sentences = metrics.sentences.map((sentence, index) => {
    const rendered = betterSentence(
      metrics,
      result,
      sentence,
      fillerGroups,
      pauseByWord
    );
    const next = metrics.sentences[index + 1];
    const ranOn =
      next !== undefined &&
      rendered !== "" &&
      endsRealSentence(metrics, sentence) &&
      (metrics.words[sentence.words[1]]?.pauseAfter ?? 0) === 0 &&
      !pauseByWord.has(next.words[0]);
    // The student ran straight into the next sentence.
    return ranOn
      ? `${rendered} ${pauseMarkup({
          seconds: SENTENCE_PAUSE_SECONDS,
          why: "You ran straight into the next sentence. Stop for a beat so this one lands.",
        })}`
      : rendered;
  });

  return collapsePauses(groupParagraphs(metrics, sentences));
}

export type Inputs = {
  metrics: Metrics;
  result: FeedbackResult;
  spokenSeconds: number;
  targetSeconds: number;
};

export function computeSubscores({
  metrics,
  result,
  spokenSeconds,
  targetSeconds,
}: Inputs) {
  const { language } = result;
  const fillers = confirmedFillers(metrics, result);
  const minutes = metrics.speechSeconds / 60;
  const wordCount = Math.max(1, metrics.words.length - fillers.count);

  const fluency =
    100 -
    fillersPerMinute(fillers.count, metrics.speechSeconds) * 5 -
    (metrics.hesitations / Math.max(minutes, 0.5)) * 5 -
    Math.max(0, metrics.longestPause - 2) * 7;
  // Flagged repetitions per minute; a couple in a long talk is normal.
  const variety =
    100 -
    Math.min(75, (language.repetition.length / Math.max(minutes, 1)) * 18);

  const outside =
    metrics.wpm < TARGET_WPM.min
      ? TARGET_WPM.min - metrics.wpm
      : Math.max(0, metrics.wpm - TARGET_WPM.max);
  const coverageOfTarget = spokenSeconds / targetSeconds;
  const pace = 100 - outside * 1.5 - Math.max(0, 0.8 - coverageOfTarget) * 60;

  // Semitone spread of 2.5+ reads as lively; a flat voice sits near 1.
  const delivery =
    metrics.pitchSemitones === null
      ? 70
      : 30 + Math.min(1, metrics.pitchSemitones / 2.5) * 70;

  const grammar =
    rubricToScore(language.rubric.grammar) -
    (language.grammar.length / wordCount) * 100 * 4;
  const vocabulary = rubricToScore(language.rubric.vocabulary);
  const depths = { brief: 0.5, good: 1, missed: 0 } as const;
  const coverage =
    language.coverage.length === 0
      ? 0.7
      : language.coverage.reduce((sum, { depth }) => sum + depths[depth], 0) /
        language.coverage.length;
  const flow =
    coverage * 60 + (rubricToScore(language.rubric.coherence) / 100) * 40;

  return {
    Delivery: clamp(delivery),
    Flow: clamp(flow),
    Fluency: clamp(fluency),
    Grammar: clamp(grammar),
    Pace: clamp(pace),
    Variety: clamp(variety),
    Vocabulary: clamp(vocabulary),
  } satisfies Record<Subscore, number>;
}

export function buildReport(inputs: Inputs): {
  feedback: AttemptFeedback;
  score: number;
} {
  const { metrics, result } = inputs;
  const { groups: fillerGroups } = confirmedFillers(metrics, result);
  const subscores = computeSubscores(inputs);
  const score = clamp(
    SUBSCORES.reduce((sum, name) => sum + subscores[name] * WEIGHTS[name], 0)
  );

  return {
    feedback: {
      better: buildBetter(metrics, result, fillerGroups),
      content: {
        missingKeyIdeas: result.content.missingKeyIdeas,
        mistakes: result.content.mistakes.map(
          ({ correction, quote, severity }) => ({
            correction,
            quote,
            severity,
          })
        ),
        verdict: result.content.verdict,
      },
      keyPoints: result.language.coverage,
      model: result.model,
      subscores: SUBSCORES.map((name) => ({ name, value: subscores[name] })),
      topThree: result.language.topThree.map(({ better, quote, why }) => ({
        better,
        quote,
        why,
      })),
      transcript: buildTranscript(metrics, result, fillerGroups),
      wpm: metrics.wpm,
    },
    score,
  };
}
