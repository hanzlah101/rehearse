import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { uuidv7 } from "@/lib/uuid";
import type { AttemptFeedback } from "@/modules/rehearsal/lib/feedback";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
};

// One thread per student, topic and target length. Rows are scoped by the
// server's student id, so students sharing a computer never see each other's.
export const rehearsals = sqliteTable(
  "rehearsals",
  {
    id: text("id").primaryKey().$defaultFn(uuidv7),
    studentId: text("student_id").notNull(),
    targetSeconds: integer("target_seconds").notNull(),
    // Title snapshot, so the thread reads the same if the topic changes.
    topic: text("topic").notNull(),
    // The server topic; null only if it was never saved there.
    topicId: text("topic_id"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("rehearsals_topic_idx").on(
      table.studentId,
      table.topicId,
      table.targetSeconds
    ),
    index("rehearsals_student_idx").on(table.studentId, table.updatedAt),
  ]
);

// recording → processing (saved; analysing locally, then reviewed on the
// server) → ready (scored). interrupted: the app closed mid-talk; the audio up
// to that point is kept and can still be analysed. failed: the analysis
// stopped (see `error`); retrying resumes it.
export const ATTEMPT_STATUSES = [
  "recording",
  "processing",
  "ready",
  "interrupted",
  "failed",
] as const;

export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export const attempts = sqliteTable(
  "attempts",
  {
    // Why the analysis failed, shown to the student; null otherwise.
    error: text("error"),
    feedback: text("feedback", { mode: "json" }).$type<AttemptFeedback>(),
    // The server's review job once the transcript was sent, so a restart
    // waits for that job instead of sending it again.
    feedbackJobId: text("feedback_job_id"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    mimeType: text("mime_type").notNull(),
    // Relative to the app data directory, e.g. recordings/<id>.webm.
    recordingPath: text("recording_path").notNull(),
    rehearsalId: text("rehearsal_id")
      .notNull()
      .references(() => rehearsals.id, { onDelete: "cascade" }),
    // 0–100, from code (never the LLM); null until analysed.
    score: integer("score"),
    // Talk time, excluding pauses.
    spokenSeconds: integer("spoken_seconds").notNull().default(0),
    status: text("status", { enum: ATTEMPT_STATUSES }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("attempts_rehearsal_idx").on(table.rehearsalId, table.createdAt),
  ]
);

export type RehearsalRow = typeof rehearsals.$inferSelect;
export type AttemptRow = typeof attempts.$inferSelect;
