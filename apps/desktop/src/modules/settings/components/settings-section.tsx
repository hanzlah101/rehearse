import type * as React from "react";
import { useId } from "react";

// One settings group: its title and a line about it on the left (above on
// narrow windows), the controls on the right. Sections are split by a hairline.
export function SettingsSection({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="grid gap-x-10 gap-y-5 border-t pt-8 md:grid-cols-5"
    >
      <div className="flex flex-col gap-1 md:col-span-2">
        <h2 className="font-heading text-lg font-semibold" id={titleId}>
          {title}
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex min-w-0 flex-col gap-5 md:col-span-3">
        {children}
      </div>
    </section>
  );
}
