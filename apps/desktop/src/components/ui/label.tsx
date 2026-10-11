import { cn } from "cn";
import { LabelContext, Label as LabelPrimitive } from "react-aria-components";
import type { LabelProps } from "react-aria-components";

function Label({ className, htmlFor, slot, ...props }: LabelProps) {
  const label = (
    <LabelPrimitive
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-data-disabled:opacity-50",
        className
      )}
      {...props}
      htmlFor={htmlFor}
      slot={slot}
    />
  );

  // An explicit htmlFor outside a React Aria field: opt out of its context.
  if (htmlFor !== undefined && slot === undefined) {
    return <LabelContext.Provider value={null}>{label}</LabelContext.Provider>;
  }

  return label;
}

export { Label };
