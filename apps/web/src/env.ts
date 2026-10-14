import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  client: {
    // The site's public origin, for absolute links such as the OG image.
    // Netlify builds take it from URL (vite.config.ts).
    VITE_SITE_URL: z.url().default("http://localhost:3000"),
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  isServer: typeof window === "undefined",
  runtimeEnv: { ...import.meta.env, ...globalThis.process?.env },
  server: {
    CORS_ORIGINS: z
      .string()
      .default("")
      .transform((value) =>
        value
          .split(",")
          .map((origin) => origin.trim())
          .filter((origin) => origin !== "")
      )
      .pipe(z.array(z.url())),
    DATABASE_URL: z.url({ protocol: /^postgres(?:ql)?$/u }),
    // Groq key for the feedback LLM (server only; the desktop never sees it).
    GROQ_API_KEY: z.string().min(1),
    // Inngest Cloud keys. Unset in development: the local Inngest dev server
    // (bun run inngest:dev) needs neither.
    INNGEST_EVENT_KEY: z.string().min(1).optional(),
    INNGEST_SIGNING_KEY: z.string().min(1).optional(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
});
