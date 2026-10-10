import { defineConfig } from "oxlint";
import tanstack from "ultracite/oxlint/tanstack";

import root from "../../oxlint.config.mts";

// Oxlint lints each file with its nearest config alone, so this extends the
// root config and repeats the properties that extends doesn't carry over.
export default defineConfig({
  extends: [root, tanstack],
  ignorePatterns: root.ignorePatterns,
});
