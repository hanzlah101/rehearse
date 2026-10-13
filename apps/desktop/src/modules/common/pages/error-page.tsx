import { ORPCError } from "@orpc/client";
import {
  IconAlertTriangleFilled,
  IconCloudOff,
  IconDatabaseExclamation,
} from "@tabler/icons-react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useRouter, useRouterState } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { LocalDataError } from "@/modules/common/db/init";
import { getErrorMessage, isNetworkError } from "@/modules/common/lib/errors";

// Replaces the whole app (title bar included) when a route fails, so it keeps
// its own drag region. Local database failures say so, network failures read as
// "offline", declared API errors show the server's message, and anything else
// (a bug) shows its own message.
export function ErrorPage({ error }: ErrorComponentProps) {
  const router = useRouter();
  const isRetrying = useRouterState({
    select: (state) => state.status === "pending",
  });
  const isLocal = error instanceof LocalDataError;
  const isOffline = isNetworkError(error);
  let Icon = IconAlertTriangleFilled;
  let title = "Something went wrong";
  if (isLocal) {
    Icon = IconDatabaseExclamation;
    title = "Couldn’t open your rehearsals";
  } else if (isOffline) {
    Icon = IconCloudOff;
    title = "Can’t reach Rehearse";
  }

  return (
    <div className="flex h-svh flex-col">
      <div data-tauri-drag-region className="h-12 shrink-0" />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-8 pb-12 text-center">
        <div className="flex flex-col items-center gap-5">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-foreground shadow-xs ring-1 ring-border ring-inset dark:bg-input/30">
            <Icon className="size-7" />
          </span>
          <div className="flex max-w-sm flex-col gap-2">
            <h1 className="text-3xl font-semibold text-balance">{title}</h1>
            <p className="text-pretty text-muted-foreground">
              {error instanceof Error &&
              !isOffline &&
              !(error instanceof ORPCError)
                ? error.message
                : getErrorMessage(error)}
            </p>
          </div>
        </div>

        <Button
          isLoading={isRetrying}
          onPress={() => {
            void router.invalidate();
          }}
          size="lg"
        >
          Try again
        </Button>
      </main>
    </div>
  );
}
