import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: text("student_id").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
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

export type Student = typeof students.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Topic = typeof topics.$inferSelect;
