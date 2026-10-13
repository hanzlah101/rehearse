import type {
  KeyPoint,
  SubmitFeedbackInput,
} from "@/server/modules/feedback/feedback.schemas";

export type Limits = {
  contentMistakes: number;
  emphasis: number;
  grammar: number;
  linking: number;
  rephrasings: number;
  repetition: number;
  suggestedPauses: number;
  vocabulary: number;
};

// List limits scale with talk length: base × minutes / 2, capped (PLAN §3.6).
export function limitsFor(spokenSeconds: number): Limits {
  const factor = Math.max(1, spokenSeconds / 60 / 2);
  const scale = (base: number, cap: number) =>
    Math.min(cap, Math.round(base * factor));

  return {
    contentMistakes: scale(3, 10),
    emphasis: scale(3, 10),
    grammar: scale(6, 20),
    linking: scale(3, 10),
    rephrasings: scale(3, 8),
    repetition: scale(4, 12),
    suggestedPauses: scale(5, 20),
    vocabulary: scale(5, 15),
  };
}

function clock(seconds: number) {
  const whole = Math.floor(seconds);

  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

// Numbered sentences with timestamps, so every finding can point at one.
function transcriptLines(input: SubmitFeedbackInput) {
  return input.sentences
    .map(
      (sentence) =>
        `[${sentence.i}] (${clock(sentence.start)}) ${sentence.text}`
    )
    .join("\n");
}

function keyPointLines(keyPoints: KeyPoint[]) {
  return keyPoints
    .map(
      (keyPoint, index) =>
        `${index + 1}. ${keyPoint.point} (key terms: ${keyPoint.keyTerms.join(", ")})`
    )
    .join("\n");
}

// Roughly 3 points for a 1-minute talk up to 7 for 10 minutes.
export function keyPointCount(targetSeconds: number) {
  return Math.min(7, Math.max(3, Math.round(2.5 + targetSeconds / 60 / 2)));
}

export const KEY_POINTS_INSTRUCTIONS = `You plan short spoken talks for English learners practising presentations.
List the key points a clear, well-structured talk on the topic should cover, in a natural order.
Each point is a short phrase of at most 8 words. Give 2 to 4 key terms per point: words a speaker would naturally use when covering it.
Write in English. No numbering or punctuation at the end of points.`;

export function keyPointsPrompt(topic: string, targetSeconds: number) {
  const minutes = Math.max(1, Math.round(targetSeconds / 60));

  return `Topic: ${topic}
Talk length: ${minutes} minute${minutes === 1 ? "" : "s"}
Number of key points: ${keyPointCount(targetSeconds)}`;
}

export const LANGUAGE_INSTRUCTIONS = `You are a precise, honest English speaking coach: friendly in tone, strict in judgement. You review the verbatim transcript of a student's spoken talk. The transcript comes from speech recognition and includes fillers, false starts and repetitions. The student is practising presentations and may not be a native speaker.

Rules for every finding:
- Reference the sentence by its index i, and copy the student's exact words from that sentence into "quote", character for character. Never invent or paraphrase a quote.
- This is speech, not writing. Never flag normal spoken fragments, contractions, false starts, self-corrections, or informal but correct phrasing. Spoken forms like "gonna", "wanna", "kinda" and "gotta" are fine. Fillers are measured separately: never list them as grammar or vocabulary issues.
- "why" is one short, friendly sentence at the student's level.
- Respect the limits given in the input. Fewer, high-value findings beat many trivial ones. Return empty lists when there is nothing worth saying.

Fields:
- fillerConfirmations: one entry per filler candidate id. isFiller is true when the word was a meaningless hesitation ("like, I went"), false when it carried meaning ("I like it").
- repetition: start from the repetition candidates. Drop necessary repeats (technical terms, the topic's own words, key terms). Label the rest (overused_word, crutch_phrase, repetitive_opener, circular_point) and give 2 to 3 alternatives.
- grammar: real grammatical errors only. "quote" is the shortest exact span containing the mistake (usually 1 to 6 words, not the whole sentence); "fix" is the corrected version of that span only.
- vocabulary: vague, weak or too casual words. "quote" is just those words; "better" is one stronger replacement for them.
- rephrasings: sentences that would be clearer or more professional. "quote" is the whole original sentence, "better" the whole rewritten sentence.
- suggestedPauses: choose every pause candidate a confident presenter would actually pause at, by id, and say how long (short about 0.5s, medium about 1s, long 1.5 to 2s) and why, specific to that spot ("let the result land before you explain it", "give the question a moment"). These become the pause marks in the improved version, so be thorough within the limit.
- emphasis: words or short phrases the student should stress when saying the improved version (the key term, the contrast, the number). "quote" is those exact words from the sentence, "why" says what stressing them does.
- linking: places where a transition word would help the listener follow; "suggestion" names it ("Add 'Next,' before moving to switch statements").
- coverage: one entry per key point, in order, with how well the talk covered it: good, brief, or missed.
- coherence: whether the talk stayed on topic, and abrupt topic jumps by sentence.
- topThree: the three changes that would improve this talk most, each quoting the student and giving the better version.
- rubric: integers from 1 to 5 for grammar, vocabulary, and coherence (structure, flow, linking). Judge against a clear, professional presentation, not against effort: 5 = polished and near-native, 4 = good with small slips, 3 = understandable but clearly flawed, 2 = frequent errors or hard to follow, 1 = very hard to follow. A halting talk full of errors, fillers and vague words gets 1 or 2; don't round up to be kind.`;

export function languagePrompt(
  input: SubmitFeedbackInput,
  keyPoints: KeyPoint[],
  limits: Limits
) {
  return `Topic: ${input.topic}
Target length: ${clock(input.targetSeconds)}; spoken: ${clock(input.spokenSeconds)}

Key points:
${keyPointLines(keyPoints)}

Measured (do not recompute): ${JSON.stringify(input.metrics)}

Limits: at most ${limits.grammar} grammar, ${limits.vocabulary} vocabulary, ${limits.rephrasings} rephrasings, ${limits.repetition} repetition, ${limits.suggestedPauses} suggested pauses, ${limits.emphasis} emphasis, ${limits.linking} linking.

Filler candidates (id, sentence, word): ${JSON.stringify(input.fillerCandidates.map(({ i, id, word }) => [id, i, word]))}

Repetition candidates (phrase, count): ${JSON.stringify(input.repetitionCandidates.map(({ count, phrase }) => [phrase, count]))}

Pause candidates (id, sentence, before word, kind): ${JSON.stringify(input.pauseCandidates.map(({ beforeWord, i, id, kind }) => [id, i, beforeWord, kind]))}

Long pauses the student made (sentence, seconds): ${JSON.stringify(input.longPauses.map(({ i, seconds }) => [i, seconds]))}

Transcript:
${transcriptLines(input)}`;
}

export const CONTENT_INSTRUCTIONS = `You check the factual and logical accuracy of what a student said in a spoken talk. This is not about English.
- Only flag clear factual or logic errors. No penalty for simplifications, opinions, personal stories, or details left out.
- Reference the sentence by its index i and copy the student's exact words into "quote". "correction" says what is actually true in one sentence.
- severity is major when it would mislead a listener, minor otherwise.
- missingKeyIdeas: up to 5 important ideas from the key points that the talk never mentioned.
- verdict: accurate, mostly_accurate, or has_errors.
- Personal or opinion topics have no factual mistakes: return none and "accurate".
- Respect the limit given in the input.`;

export function contentPrompt(
  input: SubmitFeedbackInput,
  keyPoints: KeyPoint[],
  limits: Limits
) {
  return `Topic: ${input.topic}

Key points:
${keyPointLines(keyPoints)}

Limit: at most ${limits.contentMistakes} mistakes.

Transcript:
${transcriptLines(input)}`;
}
