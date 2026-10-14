import {
  IconBrandAppleFilled,
  IconBrandUbuntu,
  IconBrandWindowsFilled,
  IconDownload,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useSyncExternalStore } from "react";

import { BlurFade } from "@/components/ui/blur-fade";
import { ButtonLink } from "@/components/ui/button";

// Every installer is attached to the latest GitHub Release
// (.github/workflows/release-desktop.yml).
const RELEASES_URL = "https://github.com/hanzlah101/rehearse/releases/latest";

const PLATFORMS = [
  {
    Icon: IconBrandAppleFilled,
    detail: "Apple silicon and Intel",
    id: "macos",
    name: "macOS",
  },
  {
    Icon: IconBrandWindowsFilled,
    detail: "Windows 10 and 11",
    id: "windows",
    name: "Windows",
  },
  {
    Icon: IconBrandUbuntu,
    detail: "AppImage and .deb",
    id: "linux",
    name: "Linux",
  },
] as const;

type Platform = (typeof PLATFORMS)[number]["id"];

function detectPlatform(): Platform | "unknown" {
  const agent = navigator.userAgent;

  // Phones and tablets can't run the app, so they get the generic download.
  if (/iPhone|iPad|Android/iu.test(agent)) {
    return "unknown";
  }
  if (/Mac/iu.test(agent)) {
    return "macos";
  }
  if (/Win/iu.test(agent)) {
    return "windows";
  }
  if (/Linux|X11/iu.test(agent)) {
    return "linux";
  }
  return "unknown";
}

function unsubscribe() {
  // Nothing to clean up: see subscribe.
}

// The platform never changes while the page is open.
function subscribe() {
  return unsubscribe;
}

function DownloadSkeleton() {
  return (
    <BlurFade
      className="col-start-1 row-start-1"
      duration={0.3}
      initial={false}
    >
      <div className="relative flex h-15 w-72 items-center gap-3 overflow-hidden rounded-xl bg-primary/10 pl-4.5 ring-1 ring-primary/20 ring-inset">
        <span className="sr-only">Finding the download for your computer</span>
        <motion.span
          animate={{ x: ["-100%", "100%"] }}
          aria-hidden
          className="absolute inset-0 bg-linear-to-r from-transparent via-card/60 to-transparent"
          transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
        />
        <span aria-hidden className="size-6 rounded-md bg-primary/25" />
        <span aria-hidden className="flex flex-col gap-2">
          <span className="h-3 w-36 rounded-md bg-primary/25" />
          <span className="h-2.5 w-24 rounded-md bg-primary/25" />
        </span>
      </div>
      <p aria-hidden className="mt-3 flex h-5 items-center">
        <span className="h-2.5 w-44 rounded-md bg-foreground/10" />
      </p>
    </BlurFade>
  );
}

function Download({ platform }: { platform: Platform | "unknown" }) {
  const current = PLATFORMS.find(({ id }) => id === platform);
  const others = PLATFORMS.filter(({ id }) => id !== platform);
  const Icon = current?.Icon ?? IconDownload;

  return (
    <BlurFade className="col-start-1 row-start-1" duration={0.3}>
      <ButtonLink className="min-w-72" href={RELEASES_URL} size="download">
        <Icon aria-hidden />
        <span className="flex flex-col items-start leading-tight">
          {current ? `Download for ${current.name}` : "Download Rehearse"}
          <span className="text-xs font-medium text-primary-foreground/75">
            {current?.detail ?? "For macOS, Windows and Linux"}
          </span>
        </span>
      </ButtonLink>
      {current ? (
        <p className="mt-3 h-5 text-sm text-muted-foreground">
          Also for{" "}
          {others.map(({ id, name }, index) => (
            <Fragment key={id}>
              {index > 0 && " and "}
              <a
                className="font-medium text-foreground underline decoration-foreground/30 underline-offset-3 transition-colors hover:decoration-foreground"
                href={RELEASES_URL}
              >
                {name}
              </a>
            </Fragment>
          ))}
        </p>
      ) : null}
    </BlurFade>
  );
}

// The visitor's platform as one button, the other two as quiet links under it.
// The platform is only known in the browser, so the server renders a skeleton
// of the same size and the button crossfades in once it's been read.
export function DownloadButtons() {
  const platform = useSyncExternalStore(
    subscribe,
    detectPlatform,
    () => "pending" as const
  );

  // Both layers share one grid cell, so the swap happens in place.
  return (
    <div className="grid justify-start">
      <AnimatePresence initial={false}>
        {platform === "pending" ? (
          <DownloadSkeleton key="pending" />
        ) : (
          <Download key="ready" platform={platform} />
        )}
      </AnimatePresence>
    </div>
  );
}
