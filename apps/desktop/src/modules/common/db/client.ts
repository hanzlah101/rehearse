import { invoke } from "@tauri-apps/api/core";
import { drizzle } from "drizzle-orm/sqlite-proxy";

type Method = "run" | "all" | "values" | "get";
type Query = { method: Method; params: unknown[]; sql: string };
type Rows = unknown[][];

// Drizzle's sqlite-proxy expects all rows for "all"/"values", and the single
// row (or undefined) for "get".
function shape(method: Method, rows: Rows) {
  return { rows: method === "get" ? rows[0] : rows };
}

// Drizzle over the Rust SQLite commands (src-tauri/src/db.rs). Use
// db.select()/insert()/update()/delete(); for several writes that must land
// together use db.batch([...]) (one transaction), never db.transaction()
// (its begin/commit would be separate calls other queries could slip between).
export const db = drizzle(
  async (sql, params, method) => {
    const rows = await invoke<Rows>("db_execute", {
      query: { method, params, sql } satisfies Query,
    });
    return shape(method, rows);
  },
  async (queries) => {
    const results = await invoke<Rows[]>("db_batch", {
      queries: queries.map(({ method, params, sql }): Query => ({
        method,
        params,
        sql,
      })),
    });
    return results.map((rows, index) =>
      shape(queries[index]?.method ?? "all", rows)
    );
  }
);

// Raw statements (migrations, maintenance) through the same commands.
export async function executeBatch(queries: Query[]) {
  await invoke("db_batch", { queries });
}

export async function selectValues(sql: string) {
  return await invoke<Rows>("db_execute", {
    query: { method: "all", params: [], sql } satisfies Query,
  });
}
