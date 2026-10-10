import { z } from "zod";

import { defineError } from "@/server/errors";

export const ExampleNotFound = defineError("EXAMPLE_NOT_FOUND", {
  status: 404,
  message: "Example not found.",
});

export const ExampleTitleTaken = defineError("EXAMPLE_TITLE_TAKEN", {
  status: 409,
  data: z.object({ existingId: z.uuid() }),
  message: "An example with this title already exists.",
});
