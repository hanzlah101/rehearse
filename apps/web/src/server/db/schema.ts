import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { FEEDBACK_DEFAULT_DAILY_SECONDS } from "@/server/modules/feedback/feedback.constants";
import type {
  FeedbackJobStatus,
  FeedbackResult,
  FeedbackStage,
  KeyPoint,
  SubmitFeedbackInput,
} from "@/server/modules/feedback/feedback.schemas";

export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: text("student_id").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  // Seconds of speech the student may send for review per rolling 24 hours.
  dailyLimitSeconds: integer("daily_limit_seconds")
    .notNull()
    .default(FEEDBACK_DEFAULT_DAILY_SECONDS),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("sessions_student_id_idx").on(table.studentId)]
);

// Topics to speak about. studentId null = offered to every student; set = typed
// by that student. Titles are unique case-insensitively within each scope.
export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    studentId: uuid("student_id").references(() => students.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("topics_shared_title_idx")
      .on(sql`lower(${table.title})`)
      .where(sql`${table.studentId} is null`),
    uniqueIndex("topics_student_title_idx")
      .on(table.studentId, sql`lower(${table.title})`)
      .where(sql`${table.studentId} is not null`),
  ]
);

// Key points a talk on a topic should cover, per target length (PLAN §2.3).
// Generated once by the LLM and reused for every student.
export const keyPoints = pgTable(
  "key_points",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    targetSeconds: integer("target_seconds").notNull(),
    points: jsonb("points").$type<KeyPoint[]>().notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("key_points_topic_target_idx").on(
      table.topicId,
      table.targetSeconds
    ),
  ]
);

// One AI review of one desktop attempt (attemptId is the desktop's id). The
// desktop sends the transcript and metrics; an Inngest run fills `result`, so
// the review finishes even if the desktop disconnects.
export const feedbackJobs = pgTable(
  "feedback_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    attemptId: uuid("attempt_id").notNull(),
    status: text("status").$type<FeedbackJobStatus>().notNull(),
    stage: text("stage").$type<FeedbackStage>().notNull(),
    input: jsonb("input").$type<SubmitFeedbackInput>().notNull(),
    result: jsonb("result").$type<FeedbackResult>(),
    error: text("error"),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("feedback_jobs_attempt_idx").on(
      table.studentId,
      table.attemptId
    ),
    index("feedback_jobs_student_created_idx").on(
      table.studentId,
      table.createdAt
    ),
  ]
);

// One row per review a student starts, never deleted with the review, so
// deleting reviews can't reset the daily limit (students.dailyLimitSeconds).
export const feedbackRequests = pgTable(
  "feedback_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    // The reviewed talk's length, rounded up; counts toward the daily limit.
    spokenSeconds: integer("spoken_seconds").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("feedback_requests_student_created_idx").on(
      table.studentId,
      table.createdAt
    ),
  ]
);

export type Student = typeof students.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type FeedbackJob = typeof feedbackJobs.$inferSelect;
