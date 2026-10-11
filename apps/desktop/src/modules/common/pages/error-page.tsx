import type { ErrorComponentProps } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/modules/common/lib/errors";

export function ErrorPage({ error }: ErrorComponentProps) {
  const router = useRouter();

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-6 px-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold text-balance">
          Something went wrong
        </h1>
        <p className="text-pretty text-muted-foreground">
          {getErrorMessage(error)}
        </p>
      </div>

      <Button
        onPress={() => {
          void router.invalidate();
        }}
        size="lg"
      >
        Try again
      </Button>
    </main>
  );
}
