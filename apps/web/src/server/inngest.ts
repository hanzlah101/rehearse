import { Inngest } from "inngest";

import { env } from "@/env";

// Background jobs (feedback reviews). In development the SDK talks to the
// local Inngest dev server (bun run inngest:dev, http://localhost:8288);
// production uses Inngest Cloud with INNGEST_EVENT_KEY/INNGEST_SIGNING_KEY.
export const inngest = new Inngest({
  eventKey: env.INNGEST_EVENT_KEY,
  id: "rehearse",
  isDev: env.NODE_ENV !== "production",
  signingKey: env.INNGEST_SIGNING_KEY,
});
