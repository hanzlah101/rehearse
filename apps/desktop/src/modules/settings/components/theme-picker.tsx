import { IconCircleCheckFilled } from "@tabler/icons-react";
import { RadioButton, RadioField, RadioGroup } from "react-aria-components";

import themeDark from "@/assets/theme-dark.svg";
import themeLight from "@/assets/theme-light.svg";
import themeSystem from "@/assets/theme-system.svg";
import { setTheme, useTheme } from "@/lib/theme";
import type { Theme } from "@/lib/theme";

const THEMES: { image: string; label: string; value: Theme }[] = [
  { image: themeSystem, label: "System", value: "system" },
  { image: themeLight, label: "Light", value: "light" },
  { image: themeDark, label: "Dark", value: "dark" },
];

function isTheme(value: string): value is Theme {
  return THEMES.some((theme) => theme.value === value);
}

// Three radio cards, each a small picture of the app in that look. Applies on
// selection; "System" follows the OS from then on.
export function ThemePicker() {
  const theme = useTheme();

  return (
    <RadioGroup
      aria-label="Theme"
      className="grid grid-cols-3 gap-3"
      onChange={(value) => {
        if (isTheme(value)) {
          setTheme(value);
        }
      }}
      value={theme}
    >
      {THEMES.map(({ image, label, value }) => (
        <RadioField key={value} value={value}>
          <RadioButton className="group/theme flex cursor-default flex-col gap-2.5 outline-hidden">
            <span className="overflow-hidden rounded-xl bg-muted ring-1 ring-border transition-shadow duration-150 ease-out group-data-focus-visible/theme:outline-2 group-data-focus-visible/theme:outline-offset-2 group-data-focus-visible/theme:outline-ring group-data-focus-visible/theme:outline-solid group-data-hovered/theme:group-not-data-selected/theme:ring-input group-data-selected/theme:ring-2 group-data-selected/theme:ring-primary motion-reduce:transition-none">
              <img alt="" className="block aspect-8/5 w-full" src={image} />
            </span>
            <span className="flex items-center gap-2 text-sm font-medium">
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full ring-1 ring-input ring-inset group-data-selected/theme:ring-0">
                <IconCircleCheckFilled
                  aria-hidden="true"
                  className="hidden size-4.5 text-primary group-data-selected/theme:block"
                />
              </span>
              {label}
            </span>
          </RadioButton>
        </RadioField>
      ))}
    </RadioGroup>
  );
}
