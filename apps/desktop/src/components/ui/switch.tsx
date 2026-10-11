import { cn } from "cn";
import type * as React from "react";
import {
  composeRenderProps,
  SwitchButton as SwitchButtonPrimitive,
  SwitchField as SwitchFieldPrimitive,
} from "react-aria-components";
import type { SwitchFieldProps as SwitchFieldPrimitiveProps } from "react-aria-components";

function Switch({
  className,
  size = "default",
  children,
  ...props
}: Omit<SwitchFieldPrimitiveProps, "children"> & {
  children?: React.ReactNode;
  size?: "sm" | "default";
}) {
  return (
    <SwitchFieldPrimitive
      data-slot="switch"
      className={composeRenderProps(className, (renderClassName) =>
        cn(
          "flex data-disabled:cursor-not-allowed data-disabled:opacity-50",
          renderClassName
        )
      )}
      {...props}
    >
      <SwitchButtonPrimitive
        data-size={size}
        className="group/switch inline-flex items-center gap-2 text-sm font-medium outline-hidden select-none"
      >
        <span
          data-slot="switch-track"
          className="inline-flex shrink-0 items-center rounded-full bg-input p-0.5 shadow-xs ring-1 ring-border transition-colors duration-200 ease-out ring-inset group-data-focus-visible/switch:outline-2 group-data-focus-visible/switch:outline-offset-2 group-data-focus-visible/switch:outline-ring group-data-focus-visible/switch:outline-solid group-data-[size=default]/switch:h-5 group-data-[size=default]/switch:w-9 group-data-[size=sm]/switch:h-4 group-data-[size=sm]/switch:w-7 group-data-selected/switch:bg-primary motion-reduce:transition-none"
        >
          <span
            data-slot="switch-thumb"
            className="block aspect-square h-full rounded-full bg-card shadow-sm transition-transform duration-200 ease-out group-data-pressed/switch:scale-90 group-data-selected/switch:translate-x-full motion-reduce:transition-none dark:bg-foreground dark:group-data-selected/switch:bg-primary-foreground"
          />
        </span>
        {children}
      </SwitchButtonPrimitive>
    </SwitchFieldPrimitive>
  );
}

export { Switch };
