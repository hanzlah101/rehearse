import process from "node:process";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;
const hasHost = host !== undefined && host !== "";
export default defineConfig(() => ({
  clearScreen: false,
  plugins: [
    tanstackRouter({
      autoCodeSplitting: true,
      target: "react",
    }),
    react(),
    tailwindcss(),
  ],
  resolve: { tsconfigPaths: true },
  server: {
    hmr: hasHost
      ? {
          host,
          port: 1421,
          protocol: "ws",
        }
      : undefined,
    host: hasHost ? host : false,
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
