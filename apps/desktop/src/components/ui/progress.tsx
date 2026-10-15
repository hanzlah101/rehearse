import { cn } from "cn";
import {
  composeRenderProps,
  Label,
  ProgressBar as ProgressBarPrimitive,
} from "react-aria-components";
import type { ProgressBarProps } from "react-aria-components";

// A task's progress on a thin track, labelled, with its value on the right
// (`valueLabel` overrides the percent). Indeterminate pulses a full track.
function Progress({
  className,
  label,
  ...props
}: Omit<ProgressBarProps, "children"> & { label: string }) {
  return (
    <ProgressBarPrimitive
      data-slot="progress"
      className={composeRenderProps(className, (renderClassName) =>
        cn("flex flex-col gap-2", renderClassName)
      )}
      {...props}
    >
      {({ isIndeterminate, percentage, valueText }) => (
        <>
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <Label className="font-medium">{label}</Label>
            <span className="text-muted-foreground tabular-nums">
              {valueText}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted dark:bg-input/30">
            {isIndeterminate ? (
              <div className="h-full w-full animate-pulse rounded-full bg-primary/60" />
            ) : (
              <div
                className="h-full w-(--fill) rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
                style={{ "--fill": `${percentage ?? 0}%` }}
              />
            )}
          </div>
        </>
      )}
    </ProgressBarPrimitive>
  );
}

export { Progress };
