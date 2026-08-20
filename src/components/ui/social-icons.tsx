// Branded link-out buttons for the two social fields a player can set
// (instagram_url / youtube_url). Still just a click-through — the app
// never fetches, proxies, or embeds either platform's content, only the
// icon is more specific than a bare text label.
export function SocialLinkButton({
  href,
  kind,
}: {
  href: string;
  kind: "instagram" | "youtube";
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400"
    >
      {kind === "instagram" ? <InstagramGlyph /> : <YoutubeGlyph />}
      {kind === "instagram" ? "Instagram" : "YouTube"}
    </a>
  );
}

function InstagramGlyph() {
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px]"
      style={{ background: "linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)" }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" className="h-3 w-3">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.3" cy="6.7" r="1" fill="#fff" stroke="none" />
      </svg>
    </span>
  );
}

function YoutubeGlyph() {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] bg-[#FF0000]">
      <svg viewBox="0 0 24 24" fill="#fff" className="h-2.5 w-2.5">
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  );
}
