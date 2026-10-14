import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { BlurFade } from "@/components/ui/blur-fade";

// Sticky over the page, on a blurred see-through bar; drops in on load.
export function Header() {
  return (
    <BlurFade className="sticky top-0 z-20" offset={-16}>
      <header className="bg-background/75 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <Link aria-label="Rehearse home" to="/">
            <Logo />
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              hash="download"
              to="/"
            >
              Download
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
    </BlurFade>
  );
}
