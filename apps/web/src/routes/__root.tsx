import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";

import { env } from "@/env";

import appCss from "@/styles.css?url";

const TITLE = "Rehearse: practise your talks out loud";
const DESCRIPTION =
  "An AI speaking coach for presentations and meetings. Record a practice run, see every filler and pause, read a better version, and try again.";

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    // next-themes sets the `.dark` class on <html> before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          {children}
        </ThemeProvider>

        <Scripts />
      </body>
    </html>
  );
}

export const Route = createRootRoute({
  head: () => ({
    links: [
      { href: appCss, rel: "stylesheet" },
      { href: "/logo.svg", rel: "icon", type: "image/svg+xml" },
    ],
    meta: [
      { charSet: "utf-8" },
      { content: "width=device-width, initial-scale=1", name: "viewport" },
      { title: TITLE },
      { content: DESCRIPTION, name: "description" },
      { content: "website", property: "og:type" },
      { content: TITLE, property: "og:title" },
      { content: DESCRIPTION, property: "og:description" },
      { content: `${env.VITE_SITE_URL}/og.png`, property: "og:image" },
      { content: "1200", property: "og:image:width" },
      { content: "630", property: "og:image:height" },
      {
        content: "Rehearse: say it better the second time.",
        property: "og:image:alt",
      },
      { content: "summary_large_image", name: "twitter:card" },
    ],
  }),
  shellComponent: RootDocument,
});
