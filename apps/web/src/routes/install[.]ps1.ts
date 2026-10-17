import { createFileRoute } from "@tanstack/react-router";

import { env } from "@/env";
import script from "@/install/install.ps1?raw";

// `irm <site>/install.ps1 | iex`: installs the desktop app on Windows without
// the browser download's SmartScreen block (see the script).
export const Route = createFileRoute("/install.ps1")({
  server: {
    handlers: {
      GET: () =>
        new Response(script.replaceAll("__SITE__", env.VITE_SITE_URL), {
          headers: {
            "cache-control": "public, max-age=300",
            "content-type": "text/plain; charset=utf-8",
          },
        }),
    },
  },
});
