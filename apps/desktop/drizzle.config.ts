import { defineConfig } from "drizzle-kit";

// Local SQLite schema. `bun --filter desktop db:generate` writes migrations to
// drizzle/, which the app bundles and applies on launch (modules/common/db).
export default defineConfig({
  dialect: "sqlite",
  out: "./drizzle",
  schema: "./src/modules/common/db/schema.ts",
});
