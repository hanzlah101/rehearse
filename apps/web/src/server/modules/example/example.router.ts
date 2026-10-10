import { openapi } from "@orpc/openapi";
import { z } from "zod";

import { inputValidation } from "@/server/core/input-validation";
import {
  ExampleNotFound,
  ExampleTitleTaken,
} from "@/server/modules/example/example.errors";
import {
  createExampleInputSchema,
  exampleSchema,
  findExampleInputSchema,
} from "@/server/modules/example/example.schemas";
import {
  createExample,
  findExample,
  findExampleByTitle,
  listExamples,
} from "@/server/modules/example/example.service";
import { publicOS } from "@/server/orpc";

const TAGS = ["Examples"];

const list = publicOS
  .meta(
    openapi({
      method: "GET",
      path: "/examples",
      summary: "List examples",
      tags: TAGS,
    })
  )
  .output(z.array(exampleSchema))
  .handler(() => listExamples());

const find = publicOS
  .meta(
    openapi({
      method: "GET",
      path: "/examples/{id}",
      summary: "Get an example",
      tags: TAGS,
    })
  )
  .use(inputValidation)
  .input(findExampleInputSchema)
  .output(exampleSchema)
  .errors({ [ExampleNotFound.code]: ExampleNotFound })
  .handler(({ input }) => {
    const example = findExample(input.id);

    if (example === null) {
      throw new ExampleNotFound();
    }

    return example;
  });

const create = publicOS
  .meta(
    openapi({
      method: "POST",
      path: "/examples",
      successStatus: 201,
      summary: "Create an example",
      tags: TAGS,
    })
  )
  .use(inputValidation)
  .input(createExampleInputSchema)
  .output(exampleSchema)
  .errors({ [ExampleTitleTaken.code]: ExampleTitleTaken })
  .handler(({ input }) => {
    const existing = findExampleByTitle(input.title);

    if (existing !== null) {
      throw new ExampleTitleTaken({ data: { existingId: existing.id } });
    }

    return createExample(input);
  });

export const exampleRouter = { create, find, list };
