import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  DOWNLOADS,
  isDownloadId,
  LATEST_RELEASE_API,
  RELEASES_URL,
} from "@/lib/downloads";

// The part of GitHub's release response we read; anything else is ignored.
const releaseSchema = z.object({
  assets: z.array(
    z.object({ browser_download_url: z.url(), name: z.string() })
  ),
});

// The latest release's installer for one platform, by how its file name ends
// (the names carry the version). Falls back to the release page if GitHub
// can't be reached or the file isn't there.
async function findInstaller(fileEnding: string) {
  const response = await fetch(LATEST_RELEASE_API, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "rehearse-website",
    },
  });
  if (!response.ok) {
    return null;
  }
  const release = releaseSchema.safeParse(await response.json());
  if (!release.success) {
    return null;
  }
  const asset = release.data.assets.find(({ name }) =>
    name.endsWith(fileEnding)
  );
  return asset?.browser_download_url ?? null;
}

function redirect(location: string) {
  return new Response(null, {
    headers: {
      "cache-control": "public, max-age=0, must-revalidate",
      location,
      // Netlify's CDN keeps the answer for 5 minutes, so GitHub's API (60
      // unauthenticated requests an hour) is asked at most a few times an hour.
      "netlify-cdn-cache-control": "public, durable, s-maxage=300",
    },
    status: 302,
  });
}

async function handle({ params }: { params: { id: string } }) {
  if (!isDownloadId(params.id)) {
    return new Response("Unknown download", { status: 404 });
  }
  const url = await findInstaller(DOWNLOADS[params.id].fileEnding).catch(
    () => null
  );
  return redirect(url ?? RELEASES_URL);
}

export const Route = createFileRoute("/download/$id")({
  server: { handlers: { GET: handle } },
});
