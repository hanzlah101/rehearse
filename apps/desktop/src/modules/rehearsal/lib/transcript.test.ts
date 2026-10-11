import { expect, test } from "bun:test";

import {
  countOf,
  parseTranscript,
  transcriptStats,
} from "@/modules/rehearsal/lib/transcript";

const markup = `<f:Um> it <g:run|runs|why> fast, <r:and then> <p:2.5> stops.

<r:And then> <f:um> ends <s:pause here> <v:good|great|why>.`;

test("parses paragraphs, marks, and plain text between them", () => {
  const paragraphs = parseTranscript(markup);

  expect(paragraphs).toHaveLength(2);
  expect(paragraphs[0]?.[0]).toEqual({ kind: "filler", text: "Um" });
  expect(paragraphs[0]?.[1]).toEqual({ kind: "text", text: " it " });
  expect(paragraphs[0]?.[2]).toEqual({
    fix: "runs",
    kind: "grammar",
    text: "run",
    why: "why",
  });
  expect(paragraphs[1]?.at(-1)).toEqual({ kind: "text", text: "." });
});

test("derives counts from marks", () => {
  const paragraphs = parseTranscript(markup);

  expect(transcriptStats(paragraphs)).toEqual({
    fillers: 2,
    longestPause: 2.5,
    repeated: 1,
  });
  expect(countOf(paragraphs, "repetition", "and then")).toBe(2);
});
