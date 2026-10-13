import { createGroq } from "@ai-sdk/groq";
import { APICallError, Output, generateText } from "ai";
import type { FlexibleSchema } from "ai";
import { NonRetriableError, RetryAfterError } from "inngest";

import { env } from "@/env";
import {
  FEEDBACK_CALL_TIMEOUT_MS,
  FEEDBACK_FALLBACK_AFTER_ATTEMPTS,
  FEEDBACK_FALLBACK_MODEL,
  FEEDBACK_MODEL,
} from "@/server/modules/feedback/feedback.constants";
import {
  CONTENT_INSTRUCTIONS,
  KEY_POINTS_INSTRUCTIONS,
  LANGUAGE_INSTRUCTIONS,
  contentPrompt,
  keyPointsPrompt,
  languagePrompt,
  limitsFor,
} from "@/server/modules/feedback/feedback.prompts";
import {
  sanitizeContent,
  sanitizeKeyPoints,
  sanitizeLanguage,
} from "@/server/modules/feedback/feedback.sanitize";
import {
  contentCheckSchema,
  keyPointsOutputSchema,
  languageFeedbackSchema,
} from "@/server/modules/feedback/feedback.schemas";
import type {
  KeyPoint,
  SubmitFeedbackInput,
} from "@/server/modules/feedback/feedback.schemas";

const groq = createGroq({ apiKey: env.GROQ_API_KEY });

// Statuses that won't get better by retrying (bad key, unknown model, too big).
const FATAL_STATUSES = new Set([401, 403, 404, 413]);

export type Usage = { tokensIn: number; tokensOut: number };

// The large model first; the small one once a step has failed twice, so a
// struggling or overloaded 120b doesn't sink the review.
export function modelFor(attempt: number) {
  return attempt >= FEEDBACK_FALLBACK_AFTER_ATTEMPTS
    ? FEEDBACK_FALLBACK_MODEL
    : FEEDBACK_MODEL;
}

function retryAfterSeconds(error: APICallError) {
  const header = error.responseHeaders?.["retry-after"];
  const seconds = header === undefined ? Number.NaN : Number(header);

  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 30;
}

// Maps provider errors onto Inngest's retry semantics: rate limits wait for
// Groq's retry-after, configuration errors stop retrying, everything else
// (timeouts, 5xx, malformed JSON) is retried with backoff.
function toStepError(error: unknown) {
  if (APICallError.isInstance(error)) {
    if (error.statusCode === 429) {
      return new RetryAfterError(
        "Groq rate limit reached.",
        `${retryAfterSeconds(error)}s`,
        { cause: error }
      );
    }

    if (
      error.statusCode !== undefined &&
      FATAL_STATUSES.has(error.statusCode)
    ) {
      return new NonRetriableError(
        `Groq rejected the request (${error.statusCode}).`,
        { cause: error }
      );
    }
  }

  return error;
}

async function generate<T>({
  attempt,
  instructions,
  name,
  prompt,
  schema,
}: {
  attempt: number;
  instructions: string;
  name: string;
  prompt: string;
  schema: FlexibleSchema<T>;
}) {
  const model = modelFor(attempt);

  try {
    const result = await generateText({
      abortSignal: AbortSignal.timeout(FEEDBACK_CALL_TIMEOUT_MS),
      instructions,
      // Inngest owns retries (with backoff and the model fallback).
      maxRetries: 0,
      model: groq(model),
      output: Output.object({ name, schema }),
      prompt,
      providerOptions: {
        groq: {
          reasoningEffort: "low",
          strictJsonSchema: true,
          structuredOutputs: true,
        },
      },
      temperature: 0.2,
    });

    return {
      model,
      output: result.output,
      usage: {
        tokensIn: result.usage.inputTokens ?? 0,
        tokensOut: result.usage.outputTokens ?? 0,
      },
    };
  } catch (error) {
    throw toStepError(error);
  }
}

export async function generateKeyPoints(
  {
    targetSeconds,
    topic,
  }: Pick<SubmitFeedbackInput, "targetSeconds" | "topic">,
  attempt: number
) {
  const { model, output, usage } = await generate({
    attempt,
    instructions: KEY_POINTS_INSTRUCTIONS,
    name: "key_points",
    prompt: keyPointsPrompt(topic, targetSeconds),
    schema: keyPointsOutputSchema,
  });

  return { keyPoints: sanitizeKeyPoints(output.keyPoints), model, usage };
}

// Call A: language, repetition, pauses, coverage (PLAN §3.6).
export async function reviewLanguage(
  input: SubmitFeedbackInput,
  keyPoints: KeyPoint[],
  attempt: number
) {
  const limits = limitsFor(input.spokenSeconds);
  const { model, output, usage } = await generate({
    attempt,
    instructions: LANGUAGE_INSTRUCTIONS,
    name: "language_feedback",
    prompt: languagePrompt(input, keyPoints, limits),
    schema: languageFeedbackSchema,
  });

  return {
    language: sanitizeLanguage(output, input, keyPoints, limits),
    model,
    usage,
  };
}

// Call B: technical correctness (PLAN §3.6), not part of the score.
export async function checkContent(
  input: SubmitFeedbackInput,
  keyPoints: KeyPoint[],
  attempt: number
) {
  const limits = limitsFor(input.spokenSeconds);
  const { model, output, usage } = await generate({
    attempt,
    instructions: CONTENT_INSTRUCTIONS,
    name: "content_check",
    prompt: contentPrompt(input, keyPoints, limits),
    schema: contentCheckSchema,
  });

  return { content: sanitizeContent(output, input, limits), model, usage };
}
