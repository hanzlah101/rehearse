import logo from "@/assets/logo.svg";
import { Switch } from "@/components/ui/switch";
import { setDark, useIsDark } from "@/lib/theme";

// Doubles as the window's title bar (macOS overlay style).
export function TitleBar() {
  const isDark = useIsDark();

  return (
    <header
      data-tauri-drag-region
      className="relative flex h-12 shrink-0 items-center justify-center"
    >
      <div className="pointer-events-none flex items-center gap-2">
        <img src={logo} alt="" className="size-6" />
        <span className="font-heading text-sm font-semibold">Rehearse</span>
      </div>
      <Switch
        className="absolute right-4"
        isSelected={isDark}
        onChange={setDark}
        size="sm"
      >
        Dark mode
      </Switch>
    </header>
  );
}
