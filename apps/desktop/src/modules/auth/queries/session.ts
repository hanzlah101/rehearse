import { safe } from "@orpc/client";
import { sessionSchema } from "@server/modules/auth/auth.schemas";
import { hashKey, queryOptions, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { getRouteApi, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";

import { clearToken, getToken } from "@/modules/auth/lib/token";
import { isUnauthorized } from "@/modules/common/lib/errors";
import { api } from "@/modules/common/lib/orpc";

export const sessionQueryOptions = queryOptions({
  queryFn: async () => {
    // No saved sign-in: logged out, without asking the server.
    if ((await getToken()) === null) {
      return null;
    }

    const { data, error } = await safe(api.auth.session());

    if (error === null) {
      return data;
    }

    // Logged out is a normal state here, not an error.
    if (isUnauthorized(error)) {
      return null;
    }

    throw error;
  },
  queryKey: ["auth", "session"],
  staleTime: "static",
});

// The last known session, kept so the next launch opens without waiting for
// the server. JSON turns the expiry into a string.
const STORAGE_KEY = "session";
const storedSessionSchema = sessionSchema.extend({
  expiresAt: z.coerce.date(),
});

function readStoredSession() {
  try {
    const stored = storedSessionSchema.safeParse(
      JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
    );
    return stored.success && stored.data.expiresAt > new Date()
      ? stored.data
      : null;
  } catch {
    return null;
  }
}

// Mirrors every change to the cached session (login, logout, rename) into
// localStorage.
export function rememberSession(queryClient: QueryClient) {
  const queryHash = hashKey(sessionQueryOptions.queryKey);

  queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || event.query.queryHash !== queryHash) {
      return;
    }
    const session = queryClient.getQueryData(sessionQueryOptions.queryKey);
    if (session === null || session === undefined) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  });
}

// On launch, a remembered session (with its token still saved) opens the app
// at once; useSessionCheck confirms it with the server in the background.
// Without one, the server is asked.
export async function loadSession(queryClient: QueryClient) {
  const cached = queryClient.getQueryData(sessionQueryOptions.queryKey);
  if (cached !== undefined) {
    return cached;
  }

  const stored = readStoredSession();
  if (stored !== null && (await getToken()) !== null) {
    queryClient.setQueryData(sessionQueryOptions.queryKey, stored);
    return stored;
  }

  return await queryClient.query(sessionQueryOptions);
}

let isChecked = false;

// Once per launch, while logged in: a revoked or expired session goes back to
// login, a name changed elsewhere shows up. Offline keeps the remembered
// session, so the app still opens without a connection.
export function useSessionCheck() {
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (isChecked) {
      return;
    }
    isChecked = true;

    async function check() {
      const { data, error } = await safe(api.auth.session());

      if (error === null) {
        const current = queryClient.getQueryData(sessionQueryOptions.queryKey);
        queryClient.setQueryData(sessionQueryOptions.queryKey, data);
        if (current?.student.name !== data.student.name) {
          await router.invalidate();
        }
        return;
      }

      if (isUnauthorized(error)) {
        // The token no longer works; forget it like a logout would.
        await clearToken().catch(() => null);
        queryClient.clear();
        queryClient.setQueryData(sessionQueryOptions.queryKey, null);
        await router.invalidate();
      }
    }

    void check();
  }, [queryClient, router]);
}

const privateRoute = getRouteApi("/(private)");

// Current session inside the (private) group; never null there.
export function useSession() {
  return privateRoute.useRouteContext({ select: (context) => context.session });
}
