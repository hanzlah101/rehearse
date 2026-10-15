import process from "node:process";

import netlify from "@netlify/vite-plugin-tanstack-start";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Netlify sets URL to the site's primary address during builds. (Assigning
// undefined to process.env would store the string "undefined".)
if (process.env.URL !== undefined) {
  process.env.VITE_SITE_URL ??= process.env.URL;
}

const config = defineConfig(({ command }) => ({
  plugins: [
    tanstackStart({
      importProtection: {
        client: {
          files: ["**/*.server.*", "**/src/server/**"],
          excludeFiles: [
            "**/node_modules/**",
            "**/src/server/**/*.schemas.ts",
            "**/src/server/**/*.errors.ts",
          ],
        },
      },
    }),
    viteReact(),
    tailwindcss(),
    // Builds server routes and functions as Netlify Functions (netlify.toml).
    // Build only: its dev emulation (edge functions server) crashes `vite dev`,
    // and local dev doesn't need it.
    ...(command === "build" ? [netlify()] : []),
  ],
  resolve: { tsconfigPaths: true },
  server: { cors: false },
}));

export default config;
