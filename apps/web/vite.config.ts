import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
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
  ],
  resolve: { tsconfigPaths: true },
  server: { cors: false },
});

export default config;
