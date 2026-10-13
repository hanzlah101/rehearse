// Parses transcript markup into marks the report highlights. Markup:
// <f:um> filler · <r:and then> repeated phrase · <g:said|fix|why> grammar ·
// <v:said|better|why> vocabulary · <p:2.4> long pause in seconds ·
// <s:why> suggested pause. In a better version: <c:better|said|why> changed
// wording · <p:0.5|why> a pause to take · <e:word|why> a word to stress.
// A blank line starts a new paragraph.

export type Mark =
  | { kind: "text"; text: string }
  | { kind: "filler"; text: string }
  | { kind: "repetition"; text: string }
  | { fix: string; kind: "grammar"; text: string; why: string }
  | { fix: string; kind: "vocabulary"; text: string; why: string }
  | { kind: "pause"; seconds: number; why: string }
  | { kind: "suggested"; why: string }
  | { kind: "changed"; said: string; text: string; why: string }
  | { kind: "emphasis"; text: string; why: string };

export type MarkKind = Mark["kind"];

const TAG = /<(?<tag>[frgvpsce]):(?<body>[^>]*)>/gu;

function toMark(tag: string, body: string): Mark {
  const [text = "", fix = "", why = ""] = body.split("|");

  switch (tag) {
    case "f": {
      return { kind: "filler", text };
    }
    case "r": {
      return { kind: "repetition", text };
    }
    case "g": {
      return { fix, kind: "grammar", text, why };
    }
    case "v": {
      return { fix, kind: "vocabulary", text, why };
    }
    case "p": {
      return { kind: "pause", seconds: Number(text), why: fix };
    }
    case "s": {
      return { kind: "suggested", why: text };
    }
    case "e": {
      return { kind: "emphasis", text, why: fix };
    }
    default: {
      return { kind: "changed", said: fix, text, why };
    }
  }
}

export function parseTranscript(markup: string): Mark[][] {
  return markup.split(/\n\s*\n/u).map((paragraph) => {
    const marks: Mark[] = [];
    let last = 0;

    for (const match of paragraph.matchAll(TAG)) {
      if (match.index > last) {
        marks.push({ kind: "text", text: paragraph.slice(last, match.index) });
      }
      marks.push(toMark(match.groups?.tag ?? "", match.groups?.body ?? ""));
      last = match.index + match[0].length;
    }
    if (last < paragraph.length) {
      marks.push({ kind: "text", text: paragraph.slice(last) });
    }

    return marks;
  });
}

// Counts the report shows, derived from the marks (never from the LLM).
export function transcriptStats(paragraphs: Mark[][]) {
  const marks = paragraphs.flat();
  const repeated = new Set<string>();
  let fillers = 0;
  let longestPause = 0;

  for (const mark of marks) {
    if (mark.kind === "filler") {
      fillers += 1;
    } else if (mark.kind === "repetition") {
      repeated.add(mark.text.toLowerCase());
    } else if (mark.kind === "pause") {
      longestPause = Math.max(longestPause, mark.seconds);
    }
  }

  return { fillers, longestPause, repeated: repeated.size };
}

// How many times this phrase (fillers, repetition) occurs in the talk.
export function countOf(paragraphs: Mark[][], kind: MarkKind, text: string) {
  return paragraphs
    .flat()
    .filter(
      (mark) =>
        mark.kind === kind &&
        "text" in mark &&
        mark.text.toLowerCase() === text.toLowerCase()
    ).length;
}
