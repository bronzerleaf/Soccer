import { ImageWithFallback } from "./image-with-fallback";

// Circular avatar for a player card/row. Falls back to a plain initial
// (first name only — never the family's surname) when there's no photo
// — or when a photo URL was provided but failed to load (expired signed
// URL, network blip) — so a browsable list never implies more identity
// than the profile actually discloses, and never shows a broken-image
// icon either.
export function PlayerAvatar({
  name,
  photoUrl,
  size = 48,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const style = { width: size, height: size };
  const initial = (
    <div
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-sm font-semibold text-gray-500"
    >
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );

  if (photoUrl) {
    return (
      <ImageWithFallback
        src={photoUrl}
        alt=""
        style={style}
        className="shrink-0 rounded-full border border-gray-200 object-cover"
        fallback={initial}
      />
    );
  }

  return initial;
}
