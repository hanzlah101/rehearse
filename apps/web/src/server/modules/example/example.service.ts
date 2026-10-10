import { randomUUID } from "node:crypto";

import type {
  CreateExampleInput,
  Example,
} from "@/server/modules/example/example.schemas";

const examples = new Map<Example["id"], Example>();

export function listExamples() {
  return [...examples.values()];
}

export function findExample(id: Example["id"]) {
  return examples.get(id) ?? null;
}

export function findExampleByTitle(title: Example["title"]) {
  const normalized = title.toLowerCase();

  return (
    listExamples().find(
      (example) => example.title.toLowerCase() === normalized
    ) ?? null
  );
}

export function createExample({ title }: CreateExampleInput) {
  const example: Example = {
    createdAt: new Date().toISOString(),
    id: randomUUID(),
    title,
  };

  examples.set(example.id, example);

  return example;
}
