import { cn } from "cn";
import type * as React from "react";

// Placeholder for content that's still loading, sized by the caller.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md bg-muted dark:bg-input/30",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
