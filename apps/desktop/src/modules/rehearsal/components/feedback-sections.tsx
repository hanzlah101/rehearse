import { IconArrowRight } from "@tabler/icons-react";
import { cn } from "cn";

import { formatNumber } from "@/lib/format";
import type { AttemptFeedback } from "@/modules/rehearsal/lib/feedback";

// The three changes that would help most (PLAN §4.2 "Top 3 fixes"), carried
// into the next attempt.
export function TopFixes({ fixes }: { fixes: AttemptFeedback["topThree"] }) {
  if (fixes.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="top-fixes" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold" id="top-fixes">
          Top {formatNumber(fixes.length)} fixes
        </h3>
        <p className="text-sm text-pretty text-muted-foreground">
          Focus on these in your next attempt.
        </p>
      </div>
      <ol className="flex flex-col gap-3">
        {fixes.map((fix, index) => (
          <li className="flex gap-4 rounded-2xl border p-4" key={fix.quote}>
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums">
              {formatNumber(index + 1)}
            </span>
            <div className="flex min-w-0 flex-col gap-1.5 text-sm">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-muted-foreground line-through decoration-destructive/60">
                  {fix.quote}
                </span>
                <IconArrowRight
                  aria-label="becomes"
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="font-medium">{fix.better}</span>
              </p>
              <p className="text-muted-foreground">{fix.why}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const VERDICTS: Record<AttemptFeedback["content"]["verdict"], string> = {
  accurate: "Everything you explained was accurate.",
  has_errors: "Some of what you explained wasn’t right.",
  mostly_accurate: "Mostly accurate, with small slips.",
};

// Technical correctness (PLAN §4.2 "Content check"): shown, never scored.
export function ContentCheck({
  content,
}: {
  content: AttemptFeedback["content"];
}) {
  return (
    <section aria-labelledby="content-check" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold" id="content-check">
          Content check
        </h3>
        <p className="text-sm text-pretty text-muted-foreground">
          {VERDICTS[content.verdict]} Not part of your score.
        </p>
      </div>
      {content.mistakes.length > 0 && (
        <ul className="flex flex-col gap-3">
          {content.mistakes.map((mistake) => (
            <li
              className={cn(
                "flex flex-col gap-1 rounded-2xl border p-4 text-sm",
                mistake.severity === "major" && "border-destructive/40"
              )}
              key={mistake.quote}
            >
              <p className="text-muted-foreground">“{mistake.quote}”</p>
              <p className="font-medium">{mistake.correction}</p>
            </li>
          ))}
        </ul>
      )}
      {content.missingKeyIdeas.length > 0 && (
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-medium">Ideas you could add</p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
            {content.missingKeyIdeas.map((idea) => (
              <li key={idea}>{idea}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
