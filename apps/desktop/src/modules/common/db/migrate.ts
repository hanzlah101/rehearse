import { executeBatch, selectValues } from "@/modules/common/db/client";

// drizzle-kit output (apps/desktop/drizzle), bundled as text. File names start
// with a zero-padded index, so sorting them gives the order to apply.
const MIGRATIONS: Record<string, string> = import.meta.glob("/drizzle/*.sql", {
  eager: true,
  import: "default",
  query: "?raw",
});

type Migration = { sql: string; tag: string };

function pendingMigrations(applied: Set<string>): Migration[] {
  const migrations = Object.entries(MIGRATIONS).map(
    ([path, sql]): Migration => ({ sql, tag: path.split("/").at(-1) ?? path })
  );

  return migrations
    .filter(({ tag }) => !applied.has(tag))
    .toSorted((first, second) => first.tag.localeCompare(second.tag));
}

// Applies every migration not yet recorded, each in its own transaction
// together with its bookkeeping row, so a failure leaves nothing half-applied.
export async function migrate() {
  await executeBatch([
    {
      method: "run",
      params: [],
      sql: "create table if not exists __migrations (tag text primary key, applied_at integer not null)",
    },
  ]);

  const rows = await selectValues("select tag from __migrations");
  const applied = new Set(rows.map((row) => String(row[0])));

  for (const { sql, tag } of pendingMigrations(applied)) {
    const statements = sql
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter((statement) => statement !== "");

    // oxlint-disable-next-line no-await-in-loop -- migrations apply in order
    await executeBatch([
      ...statements.map((statement) => ({
        method: "run" as const,
        params: [],
        sql: statement,
      })),
      {
        method: "run",
        params: [tag, Date.now()],
        sql: "insert into __migrations (tag, applied_at) values (?, ?)",
      },
    ]);
  }
}
