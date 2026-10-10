import { z } from "zod";

import { EXAMPLE_TITLE_MAX_LENGTH } from "@/server/modules/example/example.constants";

export const exampleSchema = z
  .object({
    createdAt: z.iso.datetime(),
    id: z.uuid(),
    title: z.string(),
  })
  .meta({ id: "Example" });

export const findExampleInputSchema = exampleSchema.pick({ id: true });

export const createExampleInputSchema = z
  .object({
    title: z.string().trim().min(1).max(EXAMPLE_TITLE_MAX_LENGTH),
  })
  .meta({ id: "CreateExampleInput" });

export type Example = z.infer<typeof exampleSchema>;
export type FindExampleInput = z.infer<typeof findExampleInputSchema>;
export type CreateExampleInput = z.infer<typeof createExampleInputSchema>;
