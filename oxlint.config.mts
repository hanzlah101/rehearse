import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";

export default defineConfig({
  extends: [core, react, shadcn],
  ignorePatterns: core.ignorePatterns,
  jsPlugins: shadcn.jsPlugins,
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
