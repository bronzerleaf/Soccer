function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// A club/team "crest" — no real logo, just a monogram badge. Solid navy
// with white bold initials, matching the reference design exactly on every
// screen it appears (feed cards, roster-post detail, team manage).
export function ClubCrest({
  name,
  size = 40,
}: {
  name: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
      }}
      className="flex shrink-0 items-center justify-center rounded-xl bg-slate-900 font-bold text-white"
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}
