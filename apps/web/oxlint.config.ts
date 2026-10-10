import { defineConfig } from "oxlint";
import tanstack from "ultracite/oxlint/tanstack";

import root from "../../oxlint.config.mts";

export default defineConfig({
  extends: [root, tanstack],
  ignorePatterns: root.ignorePatterns,
  overrides: [
    { files: ["src/server/**"], rules: { "node/callback-return": "off" } },
    {
      files: ["src/server/db/schema.ts"],
      rules: { "sort-keys": "off", "unicorn/no-empty-file": "off" },
    },
  ],
});
