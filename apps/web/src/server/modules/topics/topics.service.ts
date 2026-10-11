import { and, asc, desc, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@/server/db/client";
import { topics } from "@/server/db/schema";
import type { Topic as TopicRow } from "@/server/db/schema";
import type { Topic } from "@/server/modules/topics/topics.schemas";

const topicColumns = {
  id: topics.id,
  studentId: topics.studentId,
  title: topics.title,
};

function toTopic({
  id,
  studentId,
  title,
}: Pick<TopicRow, "id" | "studentId" | "title">): Topic {
  return { id, isCustom: studentId !== null, title };
}

// Shared topics plus the ones this student typed.
function visibleTo(studentId: string) {
  return or(isNull(topics.studentId), eq(topics.studentId, studentId));
}

// The student's own topics first (newest first), then the shared ones.
export async function listTopics(studentId: string) {
  const rows = await db
    .select(topicColumns)
    .from(topics)
    .where(visibleTo(studentId))
    .orderBy(
      sql`${topics.studentId} is null`,
      desc(topics.createdAt),
      asc(topics.title)
    );

  return rows.map(toTopic);
}

function findVisibleByTitle(studentId: string, title: string) {
  return (
    db
      .select(topicColumns)
      .from(topics)
      .where(
        and(
          visibleTo(studentId),
          // lower() on both sides so matching follows the unique indexes
          // exactly (JS and Postgres lowercase some Unicode differently).
          eq(sql`lower(${topics.title})`, sql`lower(${title})`)
        )
      )
      // Prefer the shared topic when the student's own one has the same title.
      .orderBy(sql`${topics.studentId} is not null`)
      .limit(1)
  );
}

// A title that matches a visible topic (case-insensitively) returns that topic
// instead of creating a duplicate.
export async function findOrCreateTopic(studentId: string, title: string) {
  const [existing] = await findVisibleByTitle(studentId, title);

  if (existing !== undefined) {
    return toTopic(existing);
  }

  const [created] = await db
    .insert(topics)
    .values({ studentId, title })
    .onConflictDoNothing()
    .returning(topicColumns);

  if (created !== undefined) {
    return toTopic(created);
  }

  // Lost a race with an identical insert: return the row that won.
  const [winner] = await findVisibleByTitle(studentId, title);

  if (winner === undefined) {
    throw new Error(`Topic "${title}" was neither created nor found.`);
  }

  return toTopic(winner);
}
