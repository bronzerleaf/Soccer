// Circular avatar for a player card/row. Falls back to a plain initial
// (first name only — never the family's surname) when there's no photo,
// so a browsable list never implies more identity than the profile
// actually discloses.
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

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        style={style}
        className="shrink-0 rounded-full border border-gray-200 object-cover"
      />
    );
  }

  return (
    <div
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-sm font-semibold text-gray-500"
    >
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
