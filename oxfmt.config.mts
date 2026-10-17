import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  // Agent skills are vendor copies, managed by the skills CLI (which also
  // writes skills-lock.json).
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    ".agents",
    ".claude/skills",
    "skills-lock.json",
  ],
  sortTailwindcss: {
    functions: ["clsx", "cva", "tw", "twMerge", "cn", "twJoin", "tv"],
    stylesheet: "./apps/desktop/src/index.css",
  },
});
