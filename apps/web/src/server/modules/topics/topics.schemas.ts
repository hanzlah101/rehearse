import { z } from "zod";

import {
  TOPIC_TITLE_MAX_LENGTH,
  TOPIC_TITLE_MIN_LENGTH,
} from "@/server/modules/topics/topics.constants";

export const topicSchema = z
  .object({
    id: z.uuid(),
    // True for a topic this student typed; false for one offered to everyone.
    isCustom: z.boolean(),
    title: z.string().meta({ examples: ["Conditional statements in C++"] }),
  })
  .meta({ id: "Topic" });

export const createTopicInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(TOPIC_TITLE_MIN_LENGTH, {
        error: `Enter a topic of at least ${TOPIC_TITLE_MIN_LENGTH} characters.`,
      })
      .max(TOPIC_TITLE_MAX_LENGTH, {
        error: `Keep the topic under ${TOPIC_TITLE_MAX_LENGTH} characters.`,
      })
      .meta({ examples: ["How the internet works"] }),
  })
  .meta({ id: "CreateTopicInput" });

export type Topic = z.infer<typeof topicSchema>;
export type CreateTopicInput = z.infer<typeof createTopicInputSchema>;
