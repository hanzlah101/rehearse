import {
  IconBrandAppleFilled,
  IconBrandUbuntu,
  IconBrandWindowsFilled,
  IconDownload,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment } from "react";

import { BlurFade } from "@/components/ui/blur-fade";
import { ButtonLink } from "@/components/ui/button";
import { DOWNLOADS, downloadUrl, RELEASES_URL, useOs } from "@/lib/downloads";
import type { DownloadId, Os } from "@/lib/downloads";

const MAIN = {
  linux: {
    detail: "AppImage",
    Icon: IconBrandUbuntu,
    id: "linux",
    name: "Linux",
  },
  macos: {
    detail: "Apple silicon",
    Icon: IconBrandAppleFilled,
    id: "macos",
    name: "macOS",
  },
  windows: {
    detail: "Windows 10 and 11",
    Icon: IconBrandWindowsFilled,
    id: "windows",
    name: "Windows",
  },
} as const;

// The other installers, each a direct download. Browsers can't tell an Apple
// silicon Mac from an Intel one, so the main macOS button is Apple silicon
// and Intel Macs get their own link.
const OTHERS = {
  linux: {
    formats: ["linux-deb", "linux-rpm"],
    platforms: ["macos", "windows"],
  },
  macos: { formats: [], platforms: ["macos-intel", "windows", "linux"] },
  windows: { formats: [], platforms: ["macos", "linux"] },
} as const satisfies Record<
  Os,
  { formats: readonly DownloadId[]; platforms: readonly DownloadId[] }
>;

const LINK =
  "font-medium text-foreground underline decoration-foreground/30 underline-offset-3 transition-colors hover:decoration-foreground";

// Download links joined as a list: "a, b and c" or "a or b".
function DownloadLinks({
  ids,
  type,
}: {
  ids: readonly DownloadId[];
  type: "conjunction" | "disjunction";
}) {
  const parts = new Intl.ListFormat("en-GB", { type }).formatToParts(
    ids.map((id) => DOWNLOADS[id].label)
  );
  let next = 0;

  return parts.map((part) => {
    if (part.type === "literal") {
      return <Fragment key={`literal-${String(next)}`}>{part.value}</Fragment>;
    }
    const id = ids[next];
    next += 1;
    return id === undefined ? null : (
      <a className={LINK} href={downloadUrl(id)} key={id}>
        {part.value}
      </a>
    );
  });
}

function OtherDownloads({ os }: { os: Os }) {
  const { formats, platforms } = OTHERS[os];

  return (
    <p className="mt-3 min-h-5 text-sm text-pretty text-muted-foreground">
      {formats.length > 0 ? (
        <>
          Also as <DownloadLinks ids={formats} type="disjunction" />, and
          for{" "}
        </>
      ) : (
        "Also for "
      )}
      <DownloadLinks ids={platforms} type="conjunction" />.
    </p>
  );
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

function Download({ os }: { os: Os | "unknown" }) {
  if (os === "unknown") {
    // Phones and tablets: no installer fits, so this opens every download.
    return (
      <BlurFade className="col-start-1 row-start-1" duration={0.3}>
        <ButtonLink className="min-w-72" href={RELEASES_URL} size="download">
          <IconDownload aria-hidden />
          <span className="flex flex-col items-start leading-tight">
            Download Rehearse
            <span className="text-xs font-medium text-primary-foreground/75">
              For macOS, Windows and Linux
            </span>
          </span>
        </ButtonLink>
      </BlurFade>
    );
  }

  const { detail, Icon, id, name } = MAIN[os];

  return (
    <BlurFade className="col-start-1 row-start-1" duration={0.3}>
      <ButtonLink className="min-w-72" href={downloadUrl(id)} size="download">
        <Icon aria-hidden />
        <span className="flex flex-col items-start leading-tight">
          Download for {name}
          <span className="text-xs font-medium text-primary-foreground/75">
            {detail}
          </span>
        </span>
      </ButtonLink>
      <OtherDownloads os={os} />
    </BlurFade>
  );
}

// The visitor's installer as one button, the others as quiet links under it,
// all direct downloads. The OS is only known in the browser, so the server
// renders a skeleton of the same size and the button crossfades in once it's
// been read.
export function DownloadButtons() {
  const os = useOs();

  // Both layers share one grid cell, so the swap happens in place.
  return (
    <div className="grid justify-start">
      <AnimatePresence initial={false}>
        {os === "pending" ? (
          <DownloadSkeleton key="pending" />
        ) : (
          <Download key="ready" os={os} />
        )}
      </AnimatePresence>
    </div>
  );
}
