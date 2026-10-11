import { openapi } from "@orpc/openapi";
import { z } from "zod";

import { inputValidation } from "@/server/core/input-validation";
import {
  createTopicInputSchema,
  topicSchema,
} from "@/server/modules/topics/topics.schemas";
import {
  findOrCreateTopic,
  listTopics,
} from "@/server/modules/topics/topics.service";
import { protectedOS } from "@/server/orpc";

const TAGS = ["Topics"];

const list = protectedOS
  .meta(
    openapi({
      description:
        "Topics this student can speak about: the ones they typed (newest first), then the ones offered to everyone.",
      method: "GET",
      path: "/topics",
      summary: "List topics",
      tags: TAGS,
    })
  )
  .output(z.array(topicSchema))
  .handler(async ({ context }) => await listTopics(context.session.student.id));

const create = protectedOS
  .meta(
    openapi({
      description:
        "Saves a topic the student typed. If a visible topic already has the same title (ignoring case), returns that one instead.",
      method: "POST",
      path: "/topics",
      successStatus: 201,
      summary: "Create a topic",
      tags: TAGS,
    })
  )
  .use(inputValidation)
  .input(createTopicInputSchema)
  .output(topicSchema)
  .handler(
    async ({ context, input }) =>
      await findOrCreateTopic(context.session.student.id, input.title)
  );

export const topicsRouter = { create, list };
