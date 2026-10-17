import {
  IconBrandAppleFilled,
  IconBrandUbuntu,
  IconBrandWindowsFilled,
  IconCopyCheckFilled,
  IconCopyFilled,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useState } from "react";
import { Tab, TabList, TabPanel, Tabs } from "react-aria-components";

import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { env } from "@/env";
import { DOWNLOADS, downloadUrl, useOs } from "@/lib/downloads";
import type { DownloadId, Os } from "@/lib/downloads";

// The installers aren't notarized (macOS) or code-signed (Windows) yet, so a
// browser download is blocked until the visitor clicks through a warning.
// The scripts (src/install/, served at /install.sh and /install.ps1) download
// without the mark that triggers those checks, so the command is the main way
// in and the installers are the fallback.
const UNIX_COMMAND = `curl -fsSL ${env.VITE_SITE_URL}/install.sh | sh`;

const PLATFORMS = {
  linux: {
    command: UNIX_COMMAND,
    downloads: ["linux-deb", "linux-rpm", "linux"],
    hint: "Paste it into a terminal. It installs the .deb or .rpm for your system, or the AppImage.",
    Icon: IconBrandUbuntu,
    name: "Linux",
    orDownload: ["Or download the ", "."],
  },
  macos: {
    command: UNIX_COMMAND,
    downloads: ["macos", "macos-intel"],
    hint: "Paste it into Terminal. It installs Rehearse in Applications and opens it.",
    Icon: IconBrandAppleFilled,
    name: "macOS",
    orDownload: [
      "Or download it for ",
      ", then allow it in System Settings → Privacy & Security → Open Anyway.",
    ],
  },
  windows: {
    command: `irm ${env.VITE_SITE_URL}/install.ps1 | iex`,
    downloads: ["windows"],
    hint: "Paste it into PowerShell. It downloads the installer and opens it.",
    Icon: IconBrandWindowsFilled,
    name: "Windows",
    orDownload: [
      "Or download ",
      "; if Windows says it protected your PC, click More info, then Run anyway.",
    ],
  },
} as const satisfies Record<
  Os,
  {
    command: string;
    downloads: readonly DownloadId[];
    hint: string;
    Icon: typeof IconBrandUbuntu;
    name: string;
    // The text around the direct download links.
    orDownload: readonly [string, string];
  }
>;

const TAB_ORDER: readonly Os[] = ["macos", "windows", "linux"];

const LINK =
  "font-medium text-foreground underline decoration-foreground/30 underline-offset-3 transition-colors hover:decoration-foreground";

// Download links joined as a list: "a, b or c".
function DownloadLinks({ ids }: { ids: readonly DownloadId[] }) {
  const parts = new Intl.ListFormat("en-GB", {
    type: "disjunction",
  }).formatToParts(ids.map((id) => DOWNLOADS[id].label));
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

function CopyButton({ text }: { text: string }) {
  const [isCopied, setIsCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard blocked: the command stays selectable on the page.
      return;
    }
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  }

  return (
    <Button
      aria-label={isCopied ? "Copied" : "Copy command"}
      onPress={() => {
        void copy();
      }}
      size="icon-sm"
      variant="ghost"
    >
      {isCopied ? (
        <IconCopyCheckFilled aria-hidden className="text-primary" />
      ) : (
        <IconCopyFilled aria-hidden />
      )}
    </Button>
  );
}

function Platform({ os }: { os: Os }) {
  const { command, downloads, hint, orDownload } = PLATFORMS[os];

  return (
    <TabPanel className="mt-3 outline-hidden" id={os}>
      <div className="flex h-12 w-full max-w-xl items-center gap-2 rounded-xl bg-card pr-1.5 pl-4 shadow-xs ring-1 ring-border">
        <code className="no-scrollbar min-w-0 flex-1 scroll-fade-x overflow-x-auto font-mono text-sm whitespace-nowrap">
          {command}
        </code>
        <CopyButton text={command} />
      </div>
      <p className="mt-3 max-w-xl text-sm text-pretty text-muted-foreground">
        {hint} {orDownload[0]}
        <DownloadLinks ids={downloads} />
        {orDownload[1]}
      </p>
    </TabPanel>
  );
}

function InstallSkeleton() {
  return (
    <BlurFade
      className="col-start-1 row-start-1"
      duration={0.3}
      initial={false}
    >
      <span className="sr-only">Finding the install for your computer</span>
      <div aria-hidden className="flex h-10 w-72 rounded-xl bg-muted" />
      <div
        aria-hidden
        className="relative mt-3 flex h-12 w-full max-w-xl overflow-hidden rounded-xl bg-primary/10 ring-1 ring-primary/20 ring-inset"
      >
        <motion.span
          animate={{ x: ["-100%", "100%"] }}
          className="absolute inset-0 bg-linear-to-r from-transparent via-card/60 to-transparent"
          transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
        />
      </div>
      <p aria-hidden className="mt-3 flex h-5 items-center">
        <span className="h-2.5 w-80 max-w-full rounded-md bg-foreground/10" />
      </p>
    </BlurFade>
  );
}

// One install command per platform, in tabs opened on the visitor's OS
// (macOS on phones, which can't run the app). The OS is only known in the
// browser, so the server renders a skeleton of the same size and the tabs
// crossfade in once it's been read.
export function InstallCommand() {
  const os = useOs();

  // Both layers share one grid cell, so the swap happens in place. One
  // shrinkable column (grid-cols-1 is minmax(0, 1fr)): an auto column would
  // grow to the unwrapped command and push it past a phone's edge.
  return (
    <div className="grid grid-cols-1">
      <AnimatePresence initial={false}>
        {os === "pending" ? (
          <InstallSkeleton key="pending" />
        ) : (
          <BlurFade
            className="col-start-1 row-start-1"
            duration={0.3}
            key="ready"
          >
            <Tabs defaultSelectedKey={os === "unknown" ? "macos" : os}>
              <TabList
                aria-label="Your computer"
                className="inline-flex gap-1 rounded-xl bg-muted p-1"
              >
                {TAB_ORDER.map((id) => {
                  const { Icon, name } = PLATFORMS[id];
                  return (
                    <Tab
                      className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground outline-hidden transition-colors hover:text-foreground data-focus-visible:outline-2 data-focus-visible:outline-ring data-selected:bg-card data-selected:text-foreground data-selected:shadow-xs"
                      id={id}
                      key={id}
                    >
                      <Icon aria-hidden className="size-4" />
                      {name}
                    </Tab>
                  );
                })}
              </TabList>
              {TAB_ORDER.map((id) => (
                <Platform key={id} os={id} />
              ))}
            </Tabs>
          </BlurFade>
        )}
      </AnimatePresence>
    </div>
  );
}
