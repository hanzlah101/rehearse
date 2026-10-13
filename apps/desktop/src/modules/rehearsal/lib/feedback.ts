import type { FeedbackResult } from "@server/modules/feedback/feedback.schemas";

// What an analysed attempt shows (PLAN §4). Built on the desktop from the
// local measurements and the server's review, stored as JSON on the attempt;
// null until the attempt has been analysed.

export const SUBSCORES = [
  "Fluency",
  "Variety",
  "Pace",
  "Delivery",
  "Grammar",
  "Vocabulary",
  "Flow",
] as const;

export type Subscore = (typeof SUBSCORES)[number];

export type KeyPointDepth =
  FeedbackResult["language"]["coverage"][number]["depth"];

export type AttemptFeedback = {
  // The better version of the talk, as transcript markup.
  better: string;
  // Technical correctness (not part of the score).
  content: {
    missingKeyIdeas: string[];
    mistakes: {
      correction: string;
      quote: string;
      severity: "major" | "minor";
    }[];
    verdict: FeedbackResult["content"]["verdict"];
  };
  keyPoints: { depth: KeyPointDepth; point: string }[];
  // The model that wrote the review.
  model: string;
  subscores: { name: Subscore; value: number }[];
  // The three changes that would help most.
  topThree: { better: string; quote: string; why: string }[];
  // What the student said, as transcript markup (transcript.ts).
  transcript: string;
  wpm: number;
};
