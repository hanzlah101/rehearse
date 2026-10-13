import { describe, expect, test } from "bun:test";

import type { FeedbackResult } from "@server/modules/feedback/feedback.schemas";

import {
  computeMetrics,
  withoutAnnotations,
} from "@/modules/analysis/lib/metrics";
import { buildReport } from "@/modules/analysis/lib/report";
import type { Word } from "@/modules/analysis/lib/speech";
import {
  parseTranscript,
  transcriptStats,
} from "@/modules/rehearsal/lib/transcript";

// "So, [UM] today I will talk about loops. Loops repeat code. And then, like,
// a for loop counts. And then the the while loop checks a condition."
const TEXT =
  "So, [UM] today I will talk about loops. Loops repeat code. And then, like, a for loop counts. And then the the while loop checks a condition.";

function wordsOf(text: string): Word[] {
  return text.split(" ").map((token, index) => ({
    end: index * 0.4 + 0.3,
    start: index * 0.4,
    text: token,
  }));
}

const words = wordsOf(TEXT);
// A 2 s silence after "code." (word 10).
const prosody = {
  duration: 30,
  intensity: [],
  pitch: [],
  silences: [[4.31, 6.31]] satisfies [number, number][],
};
// Shift the words after the silence so timings stay consistent.
for (const word of words.slice(11)) {
  word.start += 2;
  word.end += 2;
}

const result: FeedbackResult = {
  content: { missingKeyIdeas: [], mistakes: [], verdict: "accurate" },
  keyPoints: [{ keyTerms: ["for"], point: "For loops" }],
  language: {
    coherence: { jumps: [], stayedOnTopic: true },
    coverage: [{ depth: "good", point: "For loops" }],
    emphasis: [{ i: 3, quote: "condition", why: "It's the key idea." }],
    fillerConfirmations: [{ id: 1, isFiller: true }],
    grammar: [
      {
        fix: "loops repeat",
        i: 1,
        quote: "Loops repeat",
        type: "other",
        why: "x",
      },
    ],
    linking: [],
    repetition: [
      {
        alternatives: ["Next"],
        kind: "repetitive_opener",
        phrase: "And then",
        why: "Same opener.",
      },
    ],
    rephrasings: [],
    rubric: { coherence: 4, grammar: 4, vocabulary: 3 },
    suggestedPauses: [],
    topThree: [],
    vocabulary: [
      { better: "iterates", i: 2, quote: "counts", why: "More precise." },
    ],
  },
  model: "openai/gpt-oss-120b",
};

describe("computeMetrics", () => {
  const metrics = computeMetrics(words, prosody, "Loops");

  test("splits sentences and finds fillers", () => {
    expect(metrics.sentences).toHaveLength(4);
    expect(metrics.sentences[0]?.text).toBe(
      "So, um today I will talk about loops."
    );
    expect(metrics.fillers).toEqual([1]);
    expect(metrics.fillerCandidates.map(({ word }) => word)).toEqual([
      "So,",
      "like,",
    ]);
  });

  test("takes pauses from Praat silences", () => {
    expect(metrics.longPauses).toEqual([{ i: 1, seconds: 2, word: 10 }]);
    expect(metrics.longestPause).toBeCloseTo(2);
  });
});

describe("withoutAnnotations", () => {
  test("drops non-speech annotations, keeps fillers", () => {
    const noisy = wordsOf(
      "[ Background noise ] um so (music) we start [laughter] here"
    );
    expect(withoutAnnotations(noisy).map(({ text }) => text)).toEqual([
      "um",
      "so",
      "we",
      "start",
      "here",
    ]);
    expect(withoutAnnotations(wordsOf("[ Background noise ]"))).toEqual([]);
  });
});

describe("pause placement", () => {
  test("a word aligned to the start of a silence comes after it", () => {
    // "So, you know": Praat measures 2 s of silence from 8.9 s; the aligner
    // put "you" at 8.9 s too, so the pause goes before "you".
    const aligned: Word[] = [
      { end: 8.9, start: 8.1, text: "So," },
      { end: 10.96, start: 8.9, text: "you" },
      { end: 11.34, start: 10.96, text: "know" },
      { end: 11.7, start: 11.34, text: "we." },
    ];
    const metrics = computeMetrics(
      aligned,
      { duration: 12, intensity: [], pitch: [], silences: [[8.9, 10.86]] },
      "Testing"
    );
    expect(
      metrics.words.map(({ pauseAfter }) => Math.round(pauseAfter * 100) / 100)
    ).toEqual([1.96, 0, 0, 0]);
  });
});

describe("buildReport", () => {
  const metrics = computeMetrics(words, prosody, "Loops");
  const { feedback, score } = buildReport({
    metrics,
    result,
    spokenSeconds: 40,
    targetSeconds: 60,
  });

  test("marks the transcript", () => {
    const stats = transcriptStats(parseTranscript(feedback.transcript));
    expect(stats.fillers).toBe(2);
    expect(stats.repeated).toBe(1);
    expect(stats.longestPause).toBe(2);
    expect(feedback.transcript).toContain("<g:Loops repeat|loops repeat|x>");
    expect(feedback.transcript).toContain("<v:counts|iterates|More precise.>");
  });

  test("writes a better version without fillers or stutters", () => {
    expect(feedback.better).not.toContain("the the");
    expect(feedback.better).toContain("<c:iterates|counts|More precise.>");
    expect(feedback.better).toContain(
      "And then <p:0.5|Pause silently instead of “like”."
    );
  });

  test("tells where to pause and what to stress", () => {
    const marks = parseTranscript(feedback.better).flat();
    const pauses = marks.filter((mark) => mark.kind === "pause");
    // Instead of "um" and "like", and after "loops." and "counts." where the
    // student ran on (not after "code.": they paused there).
    expect(pauses).toHaveLength(4);
    expect(pauses[0]).toMatchObject({ seconds: 0.5 });
    expect(marks).toContainEqual({
      kind: "emphasis",
      text: "condition",
      why: "It's the key idea.",
    });
    expect(marks).toContainEqual({
      kind: "changed",
      said: "counts",
      text: "iterates",
      why: "More precise.",
    });
  });

  test("scores in range", () => {
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(feedback.subscores).toHaveLength(7);
  });
});

describe("pauses", () => {
  test("side-by-side pauses become one, the longest", () => {
    const metrics = computeMetrics(
      wordsOf("Hi um hope you are well."),
      null,
      "Hello"
    );
    const hope = 2;
    const { feedback } = buildReport({
      metrics,
      result: {
        ...result,
        language: {
          ...result.language,
          emphasis: [],
          grammar: [],
          repetition: [],
          suggestedPauses: metrics.pauseCandidates
            .filter(({ word }) => word === hope)
            .map(({ id }) => ({ id, length: "medium", why: "Let it land." })),
          vocabulary: [],
        },
      },
      spokenSeconds: 40,
      targetSeconds: 60,
    });
    expect(feedback.better).toBe("Hi <p:1|Let it land.> hope you are well.");
  });
});

describe("phrase fillers", () => {
  test("mark 'you know' once", () => {
    const metrics = computeMetrics(
      wordsOf("So we, you know, tried it. It worked well enough for us."),
      null,
      "Testing"
    );
    const phrase = metrics.fillerCandidates.find(({ word }) =>
      word.startsWith("you")
    );
    const { feedback } = buildReport({
      metrics,
      result: {
        ...result,
        language: {
          ...result.language,
          fillerConfirmations: [{ id: phrase?.id ?? -1, isFiller: true }],
          grammar: [],
          repetition: [],
          vocabulary: [],
        },
      },
      spokenSeconds: 40,
      targetSeconds: 60,
    });
    expect(feedback.transcript).toContain("<f:you know>");
    expect(transcriptStats(parseTranscript(feedback.transcript)).fillers).toBe(
      1
    );
    expect(feedback.better).toContain(
      "So we <p:0.5|Pause silently instead of “you know”."
    );
  });
});
