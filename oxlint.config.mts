import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";

export default defineConfig({
  extends: [core, react, shadcn],
  ignorePatterns: core.ignorePatterns,
  jsPlugins: shadcn.jsPlugins,
  overrides: [
    {
      files: ["apps/desktop/src/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@/server/**", "@/env"],
                message:
                  "Import web sources with @server/* or @env; @/server and @/env exist only for the web files' own imports.",
              },
            ],
          },
        ],
      },
    },
  ],
  rules: {
    "func-style": "off",
    "react/function-component-definition": [
      "error",
      {
        namedComponents: "function-declaration",
        unnamedComponents: "arrow-function",
      },
    ],
    "typescript/consistent-type-definitions": ["error", "type"],
  },
});
