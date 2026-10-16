import {
  REWRITE_CHUNK_CHARS,
  REWRITE_CHUNK_SENTENCES,
} from "@/server/modules/feedback/feedback.constants";
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
    // The better version's rewrites: every sentence that needs one.
    rephrasings: scale(10, 50),
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

// Who the students are, shared by every call so feedback fits them.
const STUDENTS = `The students are Pakistani ("desi") university students. Their first language is usually Urdu or Punjabi, and they speak Pakistani English with a South Asian accent. They talk about local life: Pakistani cities, food, people and places.`;

export const KEY_POINTS_INSTRUCTIONS = `You plan short spoken talks for English learners practising presentations. ${STUDENTS}
List the key points a clear, well-structured talk on the topic should cover, in a natural order.
Each point is a short phrase of at most 8 words. Give 2 to 4 key terms per point: words a speaker would naturally use when covering it.
Write in English. No numbering or punctuation at the end of points.`;

export function keyPointsPrompt(topic: string, targetSeconds: number) {
  const minutes = Math.max(1, Math.round(targetSeconds / 60));

  return `Topic: ${topic}
Talk length: ${minutes} minute${minutes === 1 ? "" : "s"}
Number of key points: ${keyPointCount(targetSeconds)}`;
}

// Who the students are and how to treat their English: every call that
// judges or rewrites their words gets this.
const STUDENT_RULES = `${STUDENTS}
- Pakistani English is a real variety. Local words, names and dishes (desi, pulao, biryani, chai, GT Road, Islamabadis) are fine; never flag or "correct" them.
- Do look for the mistakes Urdu and Punjabi speakers typically make, because fixing them sounds more professional: "very less" (much lower), "twice than" (twice as much as), "much actions" (much action), "hairs" (hair), "since two years" (for two years), "I am living here since", dropped or extra articles ("the all the", "very advanced city"), "do one thing", "discuss about", and literal translations from Urdu.
- The speech recognizer sometimes mishears accented words, so a word may be wrong in the transcript although the student said it right: a name spelled two ways (Gujranwala, Gujratwala), a word that makes no sense where it stands. Skip those entirely: never correct a name, and never blame the student for a recognition error.
- Write every "why" and suggestion in simple, clear English a student at their level understands at once. No grammar jargon.`;

// Fixes and rewrites must be right themselves, in the student's tense.
const FIX_RULES = `- Every fix, better word and rewrite must itself be correct English, keep the student's meaning and facts, and add nothing they didn't say. Check it before you answer.
- Keep the student's tense and time frame unless it's wrong: a past story stays in the past ("yesterday I went", "they gave me"), a habit stays in the present ("I usually call a friend"), a plan or "if" situation keeps its future ("if I'm hungry, I'll call a friend", not "I call"). Within one story or example, keep every sentence in the same tense, and match the sentences around it.`;

export const LANGUAGE_INSTRUCTIONS = `You are a precise, honest English speaking coach: friendly in tone, strict in judgement. You review the verbatim transcript of a student's spoken talk. The transcript comes from speech recognition and includes fillers, false starts and repetitions. The student is practising presentations.

${STUDENT_RULES}

Rules for every finding:
- Reference the sentence by its index i, and copy the student's exact words from that sentence into "quote", character for character. Never invent or paraphrase a quote.
- This is speech, not writing. Never flag normal spoken fragments, contractions, false starts, self-corrections, or informal but correct phrasing. Spoken forms like "gonna", "wanna", "kinda" and "gotta" are fine. Fillers are measured separately: never list them, or a quote that contains one ("the a like uh the"), as grammar, vocabulary or repetition issues.
${FIX_RULES}
- "why" is one short, friendly sentence at the student's level.
- Respect the limits given in the input. Fewer, high-value findings beat many trivial ones. Return empty lists when there is nothing worth saying.

Fields:
- fillerConfirmations: one entry per filler candidate id. isFiller is true when the word was a meaningless hesitation ("like, I went"), false when it carried meaning ("I like it").
- repetition: start from the repetition candidates. Drop necessary repeats (technical terms, the topic's own words, key terms, names of people, cities and places) and fillers ("you know", "like"). Label the rest (overused_word, crutch_phrase, repetitive_opener, circular_point) and give 2 to 3 alternatives.
- grammar: real grammatical errors only. "quote" is the shortest exact span containing the mistake (usually 1 to 6 words, not the whole sentence); "fix" is the corrected version of that span only.
- vocabulary: vague, weak or too casual words. "quote" is just those words; "better" is one stronger replacement for them.
- suggestedPauses: choose every pause candidate a confident presenter would actually pause at, by id, and say how long (short about 0.5s, medium about 1s, long 1.5 to 2s) and why, specific to that spot ("let the result land before you explain it", "give the question a moment"). These become the pause marks in the improved version, so be thorough within the limit.
- emphasis: words or short phrases the student should stress when saying the improved version (the key term, the contrast, the number). "quote" is those exact words from the sentence, "why" says what stressing them does.
- linking: places where a transition word would help the listener follow; "suggestion" names it ("Add 'Next,' before moving to switch statements"). The word must fit what sentence i actually says compared with the sentence before it: "However" only before a real contrast, "Finally" only before the last point.
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

Limits: at most ${limits.grammar} grammar, ${limits.vocabulary} vocabulary, ${limits.repetition} repetition, ${limits.suggestedPauses} suggested pauses, ${limits.emphasis} emphasis, ${limits.linking} linking.

Filler candidates (id, sentence, word): ${JSON.stringify(input.fillerCandidates.map(({ i, id, word }) => [id, i, word]))}

Repetition candidates (phrase, count): ${JSON.stringify(input.repetitionCandidates.map(({ count, phrase }) => [phrase, count]))}

Pause candidates (id, sentence, before word, kind): ${JSON.stringify(input.pauseCandidates.map(({ beforeWord, i, id, kind }) => [id, i, beforeWord, kind]))}

Long pauses the student made (sentence, seconds): ${JSON.stringify(input.longPauses.map(({ i, seconds }) => [i, seconds]))}

Transcript:
${transcriptLines(input)}`;
}

// The better version is written in small calls of a few sentences each (see
// rewriteChunks), so no answer grows with the talk: a long talk is more calls,
// not one huge answer that runs out of tokens.
export const REWRITE_INSTRUCTIONS = `You are an English speaking coach. You turn the verbatim transcript of a student's spoken talk into "the better version": a script of the same talk they read aloud and practise, so it must sound like them on a good day. The transcript comes from speech recognition and includes fillers, false starts and repetitions.

${STUDENT_RULES}

${FIX_RULES}

Rewrite every sentence under "Rewrite" that still wouldn't read well once fillers are taken out: false starts and restarts ("show the I'll tell you"), cut-off words ("ca- that can be"), broken or run-on sentences, grammar mistakes, literal Urdu phrasing. Leave sentences that are already fine out of the list. Sentences under "Before" are only there for context: never rewrite them.
- Keep the student's ideas, facts, examples, order and local words (desi, pulao, city names). Don't summarise, merge points, or add anything they didn't say ("In summary", new reasons, new facts).
- Use simple, natural spoken English a confident Pakistani university student would really say: short clear sentences, everyday words. No fancy or written-style vocabulary ("considerably", "highly developed", "commence"), no idioms they wouldn't use.
- One sentence in, one or two sentences out. Give the sentence's index i, "better" (the rewrite; the whole sentence is replaced) and "why", the main fix in a few words.`;

type Sentence = SubmitFeedbackInput["sentences"][number];

export type RewriteChunk = { before: Sentence[]; sentences: Sentence[] };

// Splits the talk into groups of about REWRITE_CHUNK_CHARS (at most
// REWRITE_CHUNK_SENTENCES sentences), each with the two sentences before it
// for context.
export function rewriteChunks(sentences: Sentence[]): RewriteChunk[] {
  const chunks: RewriteChunk[] = [];
  let current: Sentence[] = [];
  let length = 0;
  for (const [index, sentence] of sentences.entries()) {
    if (
      current.length > 0 &&
      (current.length >= REWRITE_CHUNK_SENTENCES ||
        length + sentence.text.length > REWRITE_CHUNK_CHARS)
    ) {
      chunks.push({
        before: sentences.slice(
          Math.max(0, index - current.length - 2),
          index - current.length
        ),
        sentences: current,
      });
      current = [];
      length = 0;
    }
    current.push(sentence);
    length += sentence.text.length;
  }
  if (current.length > 0) {
    const start = sentences.length - current.length;
    chunks.push({
      before: sentences.slice(Math.max(0, start - 2), start),
      sentences: current,
    });
  }
  return chunks;
}

function sentenceLines(items: Sentence[]) {
  return items.map(({ i, text }) => `[${i}] ${text}`).join("\n");
}

export function rewritePrompt(
  topic: string,
  { before, sentences }: RewriteChunk
) {
  return `Topic: ${topic}
${before.length > 0 ? `\nBefore (context only):\n${sentenceLines(before)}\n` : ""}
Rewrite:
${sentenceLines(sentences)}`;
}

export const CONTENT_INSTRUCTIONS = `You check the factual and logical accuracy of what a student said in a spoken talk. This is not about English. ${STUDENTS} Their own experiences and opinions about local life are not facts to check, and a misheard word from speech recognition is not a mistake.
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
