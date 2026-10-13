import { createFileRoute } from "@tanstack/react-router";
import { serve } from "inngest/edge";

import { inngest } from "@/server/inngest";
import { functions } from "@/server/modules/feedback/feedback.functions";

// Inngest calls this endpoint to run functions (the dev server locally,
// Inngest Cloud in production, which signs requests with the signing key).
const handler = serve({ client: inngest, functions });

async function handle({ request }: { request: Request }) {
  return await handler(request);
}

export const Route = createFileRoute("/api/inngest")({
  server: { handlers: { GET: handle, POST: handle, PUT: handle } },
});
