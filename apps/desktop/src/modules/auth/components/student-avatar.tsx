import { Facehash } from "facehash";

// Avatar backgrounds: the palette's cobalt plus the chart hues, so every
// student gets a face that still belongs to the app.
const AVATAR_COLORS = ["#3D6BE0", "#2BA3B5", "#D9A43A", "#E06B4A", "#9A5BC9"];

// Decorative: the student's name is always shown next to it.
export function StudentAvatar({ name, size }: { name: string; size: number }) {
  return (
    <Facehash
      aria-hidden="true"
      className="shrink-0 rounded-full"
      colors={AVATAR_COLORS}
      intensity3d="subtle"
      name={name}
      size={size}
    />
  );
}
