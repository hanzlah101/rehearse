import { createFileRoute } from "@tanstack/react-router";

import { env } from "@/env";
import script from "@/install/install.sh?raw";

// `curl -fsSL <site>/install.sh | sh`: installs the desktop app on macOS and
// Linux without the browser download's Gatekeeper block (see the script).
export const Route = createFileRoute("/install.sh")({
  server: {
    handlers: {
      GET: () =>
        new Response(script.replaceAll("__SITE__", env.VITE_SITE_URL), {
          headers: {
            "cache-control": "public, max-age=300",
            "content-type": "text/x-shellscript; charset=utf-8",
          },
        }),
    },
  },
});
