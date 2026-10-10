import type { SetCookieOptions } from "@orpc/server/helpers";

import { env } from "@/env";

export const COOKIE_OPTIONS = {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secure: env.NODE_ENV === "production",
} as const satisfies SetCookieOptions;
