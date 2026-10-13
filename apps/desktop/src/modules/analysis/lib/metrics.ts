import type {
  PauseKind,
  SubmitFeedbackInput,
} from "@server/modules/feedback/feedback.schemas";

import type { Prosody, Word } from "@/modules/analysis/lib/speech";

// Everything countable about a talk, computed here, never by the LLM
// (PLAN §3.2–3.3, §4.3): sentences, fillers, pauses, pace, repetition and
// pause candidates, pitch variation.

// Always fillers.
const FILLERS = new Set([
  "ah",
  "eh",
  "er",
  "erm",
  "hmm",
  "mm",
  "uh",
  "uhh",
  "uhm",
  "um",
  "umm",
]);

// Fillers only when used that way; the LLM confirms each one.
const AMBIGUOUS_FILLERS = new Set([
  "actually",
  "basically",
  "like",
  "literally",
  "okay",
  "right",
  "so",
]);
const AMBIGUOUS_PHRASES = new Set(["you know", "i mean", "kind of", "sort of"]);

const STOPWORDS = new Set(
  "a an and are as at be been but by can could did do does for from had has have he her his i if in into is it its just me my no not of on or our she so than that the their them then there these they this to too up us was we were what when which who will with would you your".split(
    " "
  )
);

// Openers that signal a new idea, so a missing pause before them stands out.
const TRANSITIONS = new Set([
  "another",
  "finally",
  "first",
  "however",
  "next",
  "now",
  "second",
  "secondly",
  "third",
]);

const KEY_PHRASES = [
  "in conclusion",
  "in short",
  "in summary",
  "most important",
  "the main",
  "the reason",
  "the result",
  "this means",
  "therefore",
  "to summarize",
];

const MIN_PAUSE_SECONDS = 0.3;
// How far before a silence an aligned word onset can land and still be the
// word after it.
const ONSET_TOLERANCE_SECONDS = 0.15;
export const LONG_PAUSE_SECONDS = 1.5;
const MAX_SENTENCE_WORDS = 40;
const TARGET_WPM = { max: 160, min: 130 };

export type TalkWord = {
  end: number;
  // Lowercase, no punctuation or brackets ("[UM]" → "um").
  normalized: string;
  // Seconds of silence after this word (0 if none).
  pauseAfter: number;
  sentence: number;
  start: number;
  // As displayed ("[UM]" → "um").
  text: string;
};

export type Sentence = {
  end: number;
  i: number;
  start: number;
  text: string;
  // Index of its first and last word in `words`.
  words: [number, number];
};

export type PauseCandidate = SubmitFeedbackInput["pauseCandidates"][number] & {
  // The word the pause goes before.
  word: number;
};

export type FillerCandidate =
  SubmitFeedbackInput["fillerCandidates"][number] & {
    // The candidate's words (a phrase like "you know" has two).
    words: number[];
  };

export type Metrics = {
  // Definite fillers by word index ("um", "uh").
  fillers: number[];
  fillerCandidates: FillerCandidate[];
  // Pauses between sentences or ideas vs mid-sentence hesitations.
  hesitations: number;
  longPauses: { i: number; seconds: number; word: number }[];
  longestPause: number;
  pauseCandidates: PauseCandidate[];
  pitchSemitones: number | null;
  pitchVariation: "low" | "normal" | "high";
  repetitionCandidates: { count: number; phrase: string }[];
  sentences: Sentence[];
  // First word to last word, in seconds.
  speechSeconds: number;
  words: TalkWord[];
  wpm: number;
};

export function normalizeWord(text: string) {
  return text
    .toLowerCase()
    .replaceAll(/[’‘]/gu, "'")
    .replaceAll(/[^\p{L}\p{N}'-]/gu, "")
    .replaceAll(/^'+|'+$/gu, "");
}

function displayWord(text: string) {
  const bracketed = /^\[(?<inner>[^\]]+)\](?<punctuation>[.,!?]*)$/u.exec(text);
  const { inner, punctuation = "" } = bracketed?.groups ?? {};
  return inner === undefined ? text : `${inner.toLowerCase()}${punctuation}`;
}

function endsSentence(text: string) {
  return /[.!?]["”')\]]*$/u.test(text);
}

export function isFiller(normalized: string) {
  return FILLERS.has(normalized);
}

// Pauses come from Praat's silences (measured); word onsets (DTW-aligned)
// only say which gap each silence falls in. Without Praat, gaps between
// words are used.
function pausesAfter(words: Word[], prosody: Prosody | null) {
  const pauses: number[] = words.map(() => 0);

  if (prosody !== null && prosody.silences.length > 0) {
    let k = 0;
    for (const [start, end] of prosody.silences) {
      // The pause goes before the first word starting at (or just before)
      // the silence: aligned onsets can sit at either edge of a silence,
      // never well before it.
      while (
        k + 1 < words.length &&
        (words[k + 1]?.start ?? 0) < start - ONSET_TOLERANCE_SECONDS
      ) {
        k += 1;
      }
      const isInside = start >= (words[0]?.start ?? 0) && k < words.length - 1;
      if (isInside && end - start >= MIN_PAUSE_SECONDS) {
        pauses[k] = Math.max(pauses[k] ?? 0, end - start);
      }
    }
    return pauses;
  }

  for (const [index, word] of words.entries()) {
    const next = words[index + 1];
    const gap = next === undefined ? 0 : next.start - word.end;
    pauses[index] = gap >= MIN_PAUSE_SECONDS ? gap : 0;
  }
  return pauses;
}

// Splits at sentence punctuation; an over-long run is split at its longest
// pause so every finding can point at a readable sentence.
function splitSentences(words: Omit<TalkWord, "sentence">[]) {
  const ranges: [number, number][] = [];
  let first = 0;

  for (const [index, word] of words.entries()) {
    if (endsSentence(word.text) || index === words.length - 1) {
      ranges.push([first, index]);
      first = index + 1;
    }
  }

  const split = (range: [number, number]): [number, number][] => {
    const [from, to] = range;
    if (to - from + 1 <= MAX_SENTENCE_WORDS) {
      return [range];
    }
    let cut = from + Math.floor((to - from) / 2);
    for (let index = from + 5; index < to - 5; index += 1) {
      if ((words[index]?.pauseAfter ?? 0) > (words[cut]?.pauseAfter ?? 0)) {
        cut = index;
      }
    }
    return [...split([from, cut]), ...split([cut + 1, to])];
  };

  return ranges.flatMap(split);
}

function semitoneSpread(prosody: Prosody | null) {
  const voiced = (prosody?.pitch ?? [])
    .map(([, hertz]) => hertz)
    .filter((hertz) => hertz > 0);
  if (voiced.length < 50) {
    return null;
  }
  const sorted = voiced.toSorted((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 1;
  const semitones = voiced.map((hertz) => 12 * Math.log2(hertz / median));
  const mean =
    semitones.reduce((sum, value) => sum + value, 0) / semitones.length;
  const variance =
    semitones.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    semitones.length;
  return Math.sqrt(variance);
}

// A single word worth counting on its own (not "is", "a", "the").
function isStandaloneWord(token: string) {
  return token.length > 2 && !STOPWORDS.has(token);
}

function pitchVariationOf(semitones: number | null): Metrics["pitchVariation"] {
  if (semitones === null) {
    return "normal";
  }
  if (semitones < 1.8) {
    return "low";
  }
  return semitones > 5 ? "high" : "normal";
}

function ngrams(tokens: string[], size: number) {
  const grams: string[] = [];
  for (let index = 0; index + size <= tokens.length; index += 1) {
    grams.push(tokens.slice(index, index + size).join(" "));
  }
  return grams;
}

// Words and phrases (1–4 words) said at least 3 times per 5 minutes, plus
// repeated sentence openers; the topic's own words don't count (PLAN §3.2).
function repetitionCandidates(
  sentences: Sentence[],
  words: TalkWord[],
  topic: string,
  speechSeconds: number
) {
  const topicWords = new Set(topic.split(/\s+/u).map(normalizeWord));
  const threshold = Math.max(3, Math.round((3 * speechSeconds) / 300));
  const counts = new Map<string, number>();
  const openers = new Map<string, number>();

  for (const sentence of sentences) {
    const tokens = words
      .slice(sentence.words[0], sentence.words[1] + 1)
      .map(({ normalized }) => normalized)
      .filter((token) => token !== "" && !isFiller(token));
    for (let size = 1; size <= 4; size += 1) {
      for (const gram of ngrams(tokens, size)) {
        const parts = gram.split(" ");
        const isContent = parts.some(
          (part) => !STOPWORDS.has(part) && !topicWords.has(part)
        );
        if (isContent && (size > 1 || isStandaloneWord(parts[0] ?? ""))) {
          counts.set(gram, (counts.get(gram) ?? 0) + 1);
        }
      }
    }
    const opener = tokens.slice(0, 2).join(" ");
    if (tokens.length >= 4 && opener.includes(" ")) {
      openers.set(opener, (openers.get(opener) ?? 0) + 1);
    }
  }

  const frequent = [...counts]
    .filter(([, count]) => count >= threshold)
    .toSorted(
      ([a, countA], [b, countB]) =>
        countB * b.split(" ").length - countA * a.split(" ").length
    );
  // Drop a phrase when a longer one that contains it is just as frequent.
  const kept = frequent.filter(
    ([gram, count]) =>
      !frequent.some(
        ([other, otherCount]) =>
          other !== gram && other.includes(gram) && otherCount >= count
      )
  );
  const openerCandidates = [...openers].filter(([, count]) => count >= 3);

  return [...openerCandidates, ...kept]
    .slice(0, 40)
    .map(([phrase, count]) => ({ count, phrase }));
}

function pauseCandidates(
  sentences: Sentence[],
  words: TalkWord[],
  fillers: Set<number>
) {
  const candidates: Omit<PauseCandidate, "id">[] = [];
  const push = (word: number, kind: PauseKind) => {
    const target = words[word];
    if (
      target !== undefined &&
      candidates.every((item) => item.word !== word)
    ) {
      candidates.push({
        beforeWord: target.text.replaceAll(/[.,!?;:]+$/gu, ""),
        i: target.sentence,
        kind,
        word,
      });
    }
  };

  for (const [index, sentence] of sentences.entries()) {
    const previous = sentences[index - 1];
    const previousLast =
      previous === undefined ? undefined : words[previous.words[1]];
    const hasPauseBefore =
      previousLast === undefined || previousLast.pauseAfter > 0;
    const first = words[sentence.words[0]];
    const lower = sentence.text.toLowerCase();

    if (!hasPauseBefore && previous !== undefined) {
      if (previous.text.trim().endsWith("?")) {
        push(sentence.words[0], "after_question");
      } else if (
        /\d/u.test(lower) ||
        KEY_PHRASES.some((phrase) => lower.includes(phrase))
      ) {
        push(sentence.words[0], "key_point");
      } else if (first !== undefined && TRANSITIONS.has(first.normalized)) {
        push(sentence.words[0], "between_ideas");
      }
    }

    const count = sentence.words[1] - sentence.words[0] + 1;
    const duration = sentence.end - sentence.start;
    const hasInternalPause = words
      .slice(sentence.words[0], sentence.words[1])
      .some(({ pauseAfter }) => pauseAfter > 0);
    if (
      count > 25 &&
      duration > 0 &&
      (count / duration) * 60 > 170 &&
      !hasInternalPause
    ) {
      push(sentence.words[0] + Math.floor(count / 2), "rushed_sentence");
    }
  }

  for (const filler of fillers) {
    if (candidates.length >= 120) {
      break;
    }
    if (filler + 1 < words.length) {
      push(filler + 1, "replace_filler");
    }
  }

  return candidates
    .slice(0, 120)
    .toSorted((a, b) => a.word - b.word)
    .map((candidate, id) => ({ ...candidate, id }));
}

// Ambiguous fillers ("like", "you know", sentence-initial "so") for the LLM
// to confirm.
function findFillerCandidates(words: TalkWord[], sentences: Sentence[]) {
  const fillerCandidates: FillerCandidate[] = [];
  for (const [index, word] of words.entries()) {
    const next = words[index + 1];
    const pair =
      next === undefined ? "" : `${word.normalized} ${next.normalized}`;
    const sentence = sentences[word.sentence];
    const isFirst = sentence?.words[0] === index;
    if (AMBIGUOUS_PHRASES.has(pair)) {
      fillerCandidates.push({
        i: word.sentence,
        id: fillerCandidates.length,
        word: `${word.text} ${next?.text ?? ""}`.trim(),
        words: [index, index + 1],
      });
    } else if (
      AMBIGUOUS_FILLERS.has(word.normalized) &&
      // "so" and "okay" only count at the start of a sentence.
      ((word.normalized !== "so" && word.normalized !== "okay") || isFirst) &&
      fillerCandidates.at(-1)?.words.includes(index) !== true
    ) {
      fillerCandidates.push({
        i: word.sentence,
        id: fillerCandidates.length,
        word: word.text,
        words: [index],
      });
    }
  }
  return fillerCandidates;
}

export function computeMetrics(
  rawWords: Word[],
  prosody: Prosody | null,
  topic: string
): Metrics {
  const pauses = pausesAfter(rawWords, prosody);
  const base = rawWords.map((word, index) => {
    const text = displayWord(word.text.trim());
    return {
      end: word.end,
      normalized: normalizeWord(text),
      pauseAfter: pauses[index] ?? 0,
      start: word.start,
      text,
    };
  });
  const ranges = splitSentences(base);
  const words: TalkWord[] = base.map((word) => ({ ...word, sentence: 0 }));
  const sentences: Sentence[] = ranges.map(([from, to], i) => {
    for (let index = from; index <= to; index += 1) {
      const word = words[index];
      if (word !== undefined) {
        word.sentence = i;
      }
    }
    return {
      end: words[to]?.end ?? 0,
      i,
      start: words[from]?.start ?? 0,
      text: words
        .slice(from, to + 1)
        .map(({ text }) => text)
        .join(" "),
      words: [from, to],
    };
  });

  const fillers = words.flatMap((word, index) =>
    isFiller(word.normalized) ? [index] : []
  );

  const fillerCandidates = findFillerCandidates(words, sentences);

  const speechSeconds = Math.max(
    1,
    (words.at(-1)?.end ?? 0) - (words[0]?.start ?? 0)
  );
  const spokenWords = words.filter(
    ({ normalized }) => normalized !== "" && !isFiller(normalized)
  ).length;
  const sentenceEnds = new Set(sentences.map((sentence) => sentence.words[1]));
  const pauseList = words.flatMap((word, index) =>
    word.pauseAfter > 0 ? [{ index, seconds: word.pauseAfter, word }] : []
  );
  const pitchSemitones = semitoneSpread(prosody);

  return {
    fillerCandidates: fillerCandidates.slice(0, 400),
    fillers,
    hesitations: pauseList.filter(
      ({ index, seconds }) => !sentenceEnds.has(index) && seconds >= 0.8
    ).length,
    longPauses: pauseList
      .filter(({ seconds }) => seconds >= LONG_PAUSE_SECONDS)
      .map(({ index, seconds, word }) => ({
        i: word.sentence,
        seconds: Math.round(seconds * 10) / 10,
        word: index,
      })),
    longestPause: Math.max(0, ...pauseList.map(({ seconds }) => seconds)),
    pauseCandidates: pauseCandidates(sentences, words, new Set(fillers)),
    pitchSemitones,
    pitchVariation: pitchVariationOf(pitchSemitones),
    repetitionCandidates: repetitionCandidates(
      sentences,
      words,
      topic,
      speechSeconds
    ),
    sentences,
    speechSeconds,
    words,
    wpm: Math.round((spokenWords / speechSeconds) * 60),
  };
}

export function fillersPerMinute(fillerCount: number, speechSeconds: number) {
  return (fillerCount / speechSeconds) * 60;
}

export { TARGET_WPM };
