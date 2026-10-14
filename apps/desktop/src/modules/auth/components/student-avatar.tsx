import { Avatar, Style } from "@dicebear/core";
import notionists from "@dicebear/styles/notionists.json";
import { useMemo } from "react";

// DiceBear "Notionists" (CC0, by Zoish): line-drawn faces, generated offline
// and the same for the same name. Bundled with the app, so no network.
const STYLE = new Style(notionists);

// Light tints of the palette's cobalt and chart hues, so the ink faces stay
// readable and every student still belongs to the app.
const AVATAR_COLORS = ["#C9D6F7", "#C2E6EC", "#F4E0B2", "#F6D0C4", "#E2D0F2"];

// Decorative: the student's name is always shown next to it.
export function StudentAvatar({ name, size }: { name: string; size: number }) {
  const src = useMemo(
    () =>
      new Avatar(STYLE, {
        backgroundColor: AVATAR_COLORS,
        seed: name,
        size,
      }).toDataUri(),
    [name, size]
  );

  return (
    <img
      alt=""
      aria-hidden="true"
      className="shrink-0 rounded-full"
      height={size}
      src={src}
      width={size}
    />
  );
}
