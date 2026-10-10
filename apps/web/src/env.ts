import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  client: {},
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
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
});
