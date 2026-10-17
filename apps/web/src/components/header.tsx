import { IconDownload } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { ButtonLink } from "@/components/ui/button";

// Jumps to the install commands: a direct download would hit the macOS and
// Windows warnings for apps that aren't notarized or signed yet.
function HeaderDownload() {
  return (
    <ButtonLink href="#download" size="sm">
      <IconDownload aria-hidden data-icon="inline-start" />
      Download
    </ButtonLink>
  );
}

// Sticky over the page; drops in on load. Clear at the top, so the hero's glow
// runs up behind it; once the page scrolls, only a blur keeps the content
// underneath from clashing with the links (the colour never changes).
export function Header() {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    setIsScrolled(y > 8);
  });

  return (
    <BlurFade className="sticky top-0 z-20" offset={-16}>
      <header
        className="transition-all duration-300 data-scrolled:backdrop-blur-lg"
        data-scrolled={isScrolled ? "" : undefined}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <div className="flex items-center gap-2.5">
            <Link aria-label="Rehearse home" to="/">
              <Logo />
            </Link>
            <Badge>Beta</Badge>
          </div>
          <nav className="flex items-center gap-4">
            <HeaderDownload />
            <ThemeToggle />
          </nav>
        </div>
      </header>
    </BlurFade>
  );
}
