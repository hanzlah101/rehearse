import { z } from "zod";

import {
  FEEDBACK_MAX_SENTENCES,
  FEEDBACK_MAX_TARGET_SECONDS,
} from "@/server/modules/feedback/feedback.constants";

// What the desktop sends after transcribing and measuring a talk locally
// (PLAN §3.5). Text and numbers only, never audio.

const sentenceSchema = z.object({
  end: z.number().nonnegative(),
  i: z.int().nonnegative(),
  start: z.number().nonnegative(),
  text: z.string().min(1).max(2000),
});

export const PITCH_VARIATIONS = ["low", "normal", "high"] as const;

export const PAUSE_KINDS = [
  "key_point",
  "between_ideas",
  "after_question",
  "replace_filler",
  "rushed_sentence",
] as const;

export const submitFeedbackInputSchema = z
  .object({
    // The desktop's attempt id: submitting the same attempt again returns
    // its existing job instead of starting another.
    attemptId: z.uuid(),
    // Ambiguous filler words ("like", "so"…) for the LLM to confirm by id.
    fillerCandidates: z
      .array(
        z.object({ i: z.int().nonnegative(), id: z.int(), word: z.string() })
      )
      .max(400),
    longPauses: z
      .array(z.object({ i: z.int().nonnegative(), seconds: z.number() }))
      .max(200),
    metrics: z.object({
      fillersPerMinute: z.number().nonnegative(),
      longestPauseSeconds: z.number().nonnegative(),
      pitchVariation: z.enum(PITCH_VARIATIONS),
      wpm: z.number().nonnegative(),
    }),
    // Places with no pause where one might help (PLAN §3.3), picked by id.
    pauseCandidates: z
      .array(
        z.object({
          beforeWord: z.string(),
          i: z.int().nonnegative(),
          id: z.int(),
          kind: z.enum(PAUSE_KINDS),
        })
      )
      .max(120),
    repetitionCandidates: z
      .array(
        z.object({
          count: z.int().positive(),
          phrase: z.string().min(1).max(200),
        })
      )
      .max(60),
    sentences: z.array(sentenceSchema).min(1).max(FEEDBACK_MAX_SENTENCES),
    spokenSeconds: z.number().positive(),
    targetSeconds: z.int().positive().max(FEEDBACK_MAX_TARGET_SECONDS),
    topic: z.string().trim().min(1).max(200),
    // The server topic, when there is one; key points are cached per topic.
    topicId: z.uuid().nullable(),
  })
  .meta({ id: "SubmitFeedbackInput" });

// LLM output contracts (PLAN §3.6). Strict JSON schema mode: every field is
// required and there are no numeric/length constraints (limits are enforced
// in code after generation).

export const keyPointSchema = z.object({
  keyTerms: z.array(z.string()),
  point: z.string(),
});

export const keyPointsOutputSchema = z.object({
  keyPoints: z.array(keyPointSchema),
});

export const REPETITION_KINDS = [
  "overused_word",
  "crutch_phrase",
  "repetitive_opener",
  "circular_point",
] as const;

export const GRAMMAR_TYPES = [
  "tense",
  "article",
  "preposition",
  "agreement",
  "word_order",
  "other",
] as const;

export const PAUSE_LENGTHS = ["short", "medium", "long"] as const;

export const COVERAGE_DEPTHS = ["good", "brief", "missed"] as const;

const quotedFixSchema = z.object({
  better: z.string(),
  i: z.int(),
  quote: z.string(),
  why: z.string(),
});

export const languageFeedbackSchema = z.object({
  coherence: z.object({
    jumps: z.array(z.object({ i: z.int(), note: z.string() })),
    stayedOnTopic: z.boolean(),
  }),
  coverage: z.array(
    z.object({ depth: z.enum(COVERAGE_DEPTHS), point: z.string() })
  ),
  // Words to stress when saying the better version.
  emphasis: z.array(
    z.object({ i: z.int(), quote: z.string(), why: z.string() })
  ),
  fillerConfirmations: z.array(
    z.object({ id: z.int(), isFiller: z.boolean() })
  ),
  grammar: z.array(
    z.object({
      fix: z.string(),
      i: z.int(),
      quote: z.string(),
      type: z.enum(GRAMMAR_TYPES),
      why: z.string(),
    })
  ),
  linking: z.array(z.object({ i: z.int(), suggestion: z.string() })),
  rephrasings: z.array(quotedFixSchema),
  repetition: z.array(
    z.object({
      alternatives: z.array(z.string()),
      kind: z.enum(REPETITION_KINDS),
      phrase: z.string(),
      why: z.string(),
    })
  ),
  rubric: z.object({
    coherence: z.int(),
    grammar: z.int(),
    vocabulary: z.int(),
  }),
  suggestedPauses: z.array(
    z.object({ id: z.int(), length: z.enum(PAUSE_LENGTHS), why: z.string() })
  ),
  topThree: z.array(quotedFixSchema),
  vocabulary: z.array(quotedFixSchema),
});

export const CONTENT_VERDICTS = [
  "accurate",
  "mostly_accurate",
  "has_errors",
] as const;

export const contentCheckSchema = z.object({
  missingKeyIdeas: z.array(z.string()),
  mistakes: z.array(
    z.object({
      correction: z.string(),
      i: z.int(),
      quote: z.string(),
      severity: z.enum(["major", "minor"]),
    })
  ),
  verdict: z.enum(CONTENT_VERDICTS),
});

export const feedbackResultSchema = z
  .object({
    content: contentCheckSchema,
    keyPoints: z.array(keyPointSchema),
    language: languageFeedbackSchema,
    // The model that wrote the review (the fallback model after retries).
    model: z.string(),
  })
  .meta({ id: "FeedbackResult" });

export const FEEDBACK_JOB_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;

// Where a run is, in order. Realtime messages and `feedback.get` both report it.
export const FEEDBACK_STAGES = [
  "queued",
  "key_points",
  "language",
  "content",
  "done",
] as const;

export const feedbackJobSchema = z
  .object({
    attemptId: z.uuid(),
    error: z.string().nullable(),
    id: z.uuid(),
    result: feedbackResultSchema.nullable(),
    stage: z.enum(FEEDBACK_STAGES),
    status: z.enum(FEEDBACK_JOB_STATUSES),
  })
  .meta({ id: "FeedbackJob" });

export const feedbackJobParamsSchema = z.object({ id: z.uuid() });

// Published on the job's realtime channel at every stage change.
export const feedbackStatusSchema = z.object({
  error: z.string().nullable(),
  stage: z.enum(FEEDBACK_STAGES),
  status: z.enum(FEEDBACK_JOB_STATUSES),
});

export const feedbackSubscriptionSchema = z
  .object({
    apiBaseUrl: z.string().nullable(),
    channel: z.string(),
    key: z.string(),
    topic: z.literal("status"),
  })
  .meta({ id: "FeedbackSubscription" });

// Speaking time sent for review in the last 24 hours, against the student's
// limit. refreshesAt: when enough of it leaves the window to review again,
// set only while the limit is used up.
export const feedbackUsageSchema = z
  .object({
    limitSeconds: z.int().nonnegative(),
    refreshesAt: z
      .date()
      .nullable()
      .meta({ examples: ["2026-11-10T09:00:00.000Z"] }),
    usedSeconds: z.int().nonnegative(),
  })
  .meta({ id: "FeedbackUsage" });

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackInputSchema>;
export type KeyPoint = z.infer<typeof keyPointSchema>;
export type LanguageFeedback = z.infer<typeof languageFeedbackSchema>;
export type ContentCheck = z.infer<typeof contentCheckSchema>;
export type FeedbackResult = z.infer<typeof feedbackResultSchema>;
export type FeedbackJobStatus = (typeof FEEDBACK_JOB_STATUSES)[number];
export type FeedbackStage = (typeof FEEDBACK_STAGES)[number];
export type FeedbackJobView = z.infer<typeof feedbackJobSchema>;
export type FeedbackStatus = z.infer<typeof feedbackStatusSchema>;
export type FeedbackSubscription = z.infer<typeof feedbackSubscriptionSchema>;
export type FeedbackUsage = z.infer<typeof feedbackUsageSchema>;
export type PauseKind = (typeof PAUSE_KINDS)[number];
