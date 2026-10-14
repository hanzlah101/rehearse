import { cn } from "cn";

// The app icon (apps/desktop/src/assets/logo.svg, copied to public/) and the
// wordmark.
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center gap-2.5 font-heading text-lg font-semibold",
        className
      )}
    >
      <img alt="" className="size-7" height={28} src="/logo.svg" width={28} />
      Rehearse
    </span>
  );
}
