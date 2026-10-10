import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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

export type Student = typeof students.$inferSelect;
export type Session = typeof sessions.$inferSelect;
