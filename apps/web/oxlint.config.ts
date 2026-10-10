import { defineConfig } from "oxlint";
import tanstack from "ultracite/oxlint/tanstack";

import root from "../../oxlint.config.mts";

export default defineConfig({
  extends: [root, tanstack],
  ignorePatterns: root.ignorePatterns,
  overrides: [
    {
      files: ["src/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: [
              {
                importNames: ["error", "ORPCError"],
                message:
                  "Define errors with defineError() from @/server/errors and throw those classes.",
                name: "@orpc/server",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["src/server/errors.ts", "src/server/core/**"],
      rules: { "no-restricted-imports": "off" },
    },
    { files: ["src/server/**"], rules: { "node/callback-return": "off" } },
    {
      files: ["src/server/db/schema.ts"],
      rules: { "sort-keys": "off", "unicorn/no-empty-file": "off" },
    },
  ],
});
