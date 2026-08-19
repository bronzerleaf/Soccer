// Deterministic color from a name, so the same club always gets the same
// crest color without storing one. Not cryptographic — just a stable hash.
function hueFor(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// A club/team "crest" — no real logo, just a colored monogram badge. Used
// anywhere the reference design shows a club shield, so club/team names
// read as a place, not just a text label in a sentence.
export function ClubCrest({
  name,
  size = 40,
}: {
  name: string;
  size?: number;
}) {
  const hue = hueFor(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        background: `hsl(${hue} 45% 30%)`,
        fontSize: size * 0.34,
      }}
      className="flex shrink-0 items-center justify-center rounded-xl font-bold text-white"
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}
