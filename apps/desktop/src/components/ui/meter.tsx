import { cn } from "cn";
import {
  composeRenderProps,
  Label,
  Meter as MeterPrimitive,
} from "react-aria-components";
import type { MeterProps } from "react-aria-components";

// A labelled value on a thin track (scores, levels). React Aria announces it
// as a meter with its formatted value.
function Meter({
  className,
  label,
  ...props
}: Omit<MeterProps, "children"> & { label: string }) {
  return (
    <MeterPrimitive
      data-slot="meter"
      className={composeRenderProps(className, (renderClassName) =>
        cn("flex flex-col gap-2", renderClassName)
      )}
      {...props}
    >
      {({ percentage, valueText }) => (
        <>
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <Label>{label}</Label>
            <span className="font-medium tabular-nums">{valueText}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted dark:bg-input/30">
            <div
              className="h-full w-(--fill) rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ "--fill": `${percentage}%` }}
            />
          </div>
        </>
      )}
    </MeterPrimitive>
  );
}

export { Meter };
