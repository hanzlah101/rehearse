import type { Limits } from "@/server/modules/feedback/feedback.prompts";
import type {
  ContentCheck,
  KeyPoint,
  LanguageFeedback,
  SubmitFeedbackInput,
} from "@/server/modules/feedback/feedback.schemas";

// The LLM explains; code decides what's trustworthy enough to show. Findings
// must point at a real sentence and quote it exactly (PLAN: "must quote the
// exact phrase"), lists respect the limits, scores stay in range.

function normalize(text: string) {
  return text
    .toLowerCase()
    .replaceAll(/[’‘]/gu, "'")
    .replaceAll(/\s+/gu, " ")
    .trim();
}

function quoteIsIn(sentences: Map<number, string>, i: number, quote: string) {
  const sentence = sentences.get(i);
  const needle = normalize(quote);

  return (
    sentence !== undefined &&
    needle !== "" &&
    normalize(sentence).includes(needle)
  );
}

// Hesitations the model sometimes files as grammar ("the a like uh the").
const HESITATION = /\b(?:u+h+|u+m+|e+r+m*|h+m+)\b/u;

// Fillers are counted separately, so they're never repetition findings.
const FILLER_PHRASES = new Set(["like", "you know", "i mean", "um", "uh"]);

function clampRubric(value: number) {
  return Math.min(5, Math.max(1, Math.round(value)));
}

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

export function sanitizeKeyPoints(keyPoints: KeyPoint[]) {
  return uniqueBy(
    keyPoints
      .map(({ keyTerms, point }) => ({
        keyTerms: keyTerms
          .map((term) => term.trim())
          .filter(Boolean)
          .slice(0, 4),
        point: point.trim(),
      }))
      .filter(({ point }) => point !== ""),
    ({ point }) => normalize(point)
  ).slice(0, 8);
}

export function sanitizeLanguage(
  output: LanguageFeedback,
  input: SubmitFeedbackInput,
  keyPoints: KeyPoint[],
  limits: Limits
): LanguageFeedback {
  const sentences = new Map(input.sentences.map(({ i, text }) => [i, text]));
  const fillerIds = new Set(input.fillerCandidates.map(({ id }) => id));
  const pauseIds = new Set(input.pauseCandidates.map(({ id }) => id));
  const quoted = <T extends { i: number; quote: string }>(items: T[]) =>
    items.filter(({ i, quote }) => quoteIsIn(sentences, i, quote));
  const fluent = <T extends { quote: string }>(items: T[]) =>
    items.filter(({ quote }) => !HESITATION.test(normalize(quote)));
  // The topic's own words and the key terms are meant to repeat.
  const topic = normalize(input.topic);
  const keyTerms = new Set(
    keyPoints.flatMap(({ keyTerms: terms }) => terms.map(normalize))
  );
  const fillers = new Set([
    ...FILLER_PHRASES,
    ...input.fillerCandidates.map(({ word }) => normalize(word)),
  ]);
  const isNecessaryRepeat = (phrase: string) =>
    topic.includes(phrase) || keyTerms.has(phrase) || fillers.has(phrase);
  const coverage = new Map(
    output.coverage.map((item) => [normalize(item.point), item.depth])
  );

  return {
    coherence: {
      jumps: output.coherence.jumps
        .filter(({ i }) => sentences.has(i))
        .slice(0, 5),
      stayedOnTopic: output.coherence.stayedOnTopic,
    },
    // One entry per key point, in the key points' order and wording; a point
    // the model skipped counts as missed.
    coverage: keyPoints.map(({ point }) => ({
      depth: coverage.get(normalize(point)) ?? "missed",
      point,
    })),
    emphasis: quoted(output.emphasis).slice(0, limits.emphasis),
    fillerConfirmations: uniqueBy(
      output.fillerConfirmations.filter(({ id }) => fillerIds.has(id)),
      ({ id }) => String(id)
    ),
    grammar: fluent(quoted(output.grammar))
      .filter(({ fix, quote }) => normalize(fix) !== normalize(quote))
      .slice(0, limits.grammar),
    linking: output.linking
      .filter(({ i }) => sentences.has(i))
      .slice(0, limits.linking),
    rephrasings: quoted(output.rephrasings).slice(0, limits.rephrasings),
    repetition: uniqueBy(
      output.repetition.filter(
        ({ phrase }) =>
          phrase.trim() !== "" && !isNecessaryRepeat(normalize(phrase))
      ),
      ({ phrase }) => normalize(phrase)
    )
      .map((item) => ({ ...item, alternatives: item.alternatives.slice(0, 3) }))
      .slice(0, limits.repetition),
    rubric: {
      coherence: clampRubric(output.rubric.coherence),
      grammar: clampRubric(output.rubric.grammar),
      vocabulary: clampRubric(output.rubric.vocabulary),
    },
    suggestedPauses: uniqueBy(
      output.suggestedPauses.filter(({ id }) => pauseIds.has(id)),
      ({ id }) => String(id)
    ).slice(0, limits.suggestedPauses),
    topThree: quoted(output.topThree).slice(0, 3),
    vocabulary: fluent(quoted(output.vocabulary))
      .filter(({ better, quote }) => normalize(better) !== normalize(quote))
      .slice(0, limits.vocabulary),
  };
}

export function sanitizeContent(
  output: ContentCheck,
  input: SubmitFeedbackInput,
  limits: Limits
): ContentCheck {
  const sentences = new Map(input.sentences.map(({ i, text }) => [i, text]));
  const mistakes = output.mistakes
    .filter(({ i, quote }) => quoteIsIn(sentences, i, quote))
    .slice(0, limits.contentMistakes);

  return {
    missingKeyIdeas: output.missingKeyIdeas
      .map((idea) => idea.trim())
      .filter(Boolean)
      .slice(0, 5),
    mistakes,
    // A verdict of errors with none left after checking reads as mostly fine.
    verdict:
      output.verdict === "has_errors" && mistakes.length === 0
        ? "mostly_accurate"
        : output.verdict,
  };
}
