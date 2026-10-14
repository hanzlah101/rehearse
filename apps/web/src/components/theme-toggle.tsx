import { IconMoonFilled, IconSunFilled } from "@tabler/icons-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

// Flips between light and dark; until then the site follows the OS. Both icons
// render and CSS shows the right one, so the server markup never guesses.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      aria-label="Toggle dark mode"
      onPress={() => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
      }}
      size="icon-sm"
      variant="ghost"
    >
      <IconMoonFilled aria-hidden className="dark:hidden" />
      <IconSunFilled aria-hidden className="hidden dark:block" />
    </Button>
  );
}
