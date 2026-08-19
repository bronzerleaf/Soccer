import type { OEmbedPreview } from "@/lib/oembed/server";
import { detectPlatform, type PlatformKind } from "@/lib/oembed/platform";

// A grid of link-out tiles for a player's highlight/social links — styled
// like a gallery a family is building, not a list of bare URLs. Still never
// hosts anything: every tile links out to the provider, and a tile without
// a fetchable thumbnail (Instagram, or any failed/unknown provider) still
// renders as a deliberate, branded card instead of falling back to plain
// text. See src/lib/oembed/server.ts for where previews come from.
export function LinkGallery({
  links,
  previews,
}: {
  links: string[];
  previews: (OEmbedPreview | null)[];
}) {
  if (links.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {links.map((url, i) => (
        <GalleryTile key={url} url={url} preview={previews[i] ?? null} />
      ))}
    </div>
  );
}

function GalleryTile({
  url,
  preview,
}: {
  url: string;
  preview: OEmbedPreview | null;
}) {
  const platform = detectPlatform(url);
  const caption =
    preview?.title ??
    (platform.kind === "photo" ? `View on ${platform.name}` : `Open on ${platform.name}`);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-xl border border-slate-200 transition-shadow hover:shadow-md"
    >
      <div
        className="relative aspect-square w-full overflow-hidden"
        style={preview ? undefined : { background: platform.gradient }}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/20" />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <PlatformGlyph kind={platform.kind} />
          </div>
        )}
        {platform.kind !== "photo" ? (
          <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm">
            <PlayGlyph />
          </span>
        ) : null}
      </div>
      <div className="px-2.5 py-2">
        <p className="truncate text-xs font-medium text-slate-900">{caption}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          {preview?.providerName ?? platform.name}
        </p>
      </div>
    </a>
  );
}

function PlatformGlyph({ kind }: { kind: PlatformKind }) {
  if (kind === "photo") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="1.6"
        className="h-8 w-8 opacity-90"
      >
        <rect x="3" y="5" width="18" height="15" rx="3.5" />
        <circle cx="12" cy="12.5" r="4" />
        <circle cx="17" cy="8.5" r="0.7" fill="white" stroke="none" />
      </svg>
    );
  }
  if (kind === "video") {
    return (
      <svg viewBox="0 0 24 24" fill="white" className="h-8 w-8 opacity-90">
        <circle cx="12" cy="12" r="10" fillOpacity="0.25" />
        <path d="M10 8.5l6 3.5-6 3.5z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7 opacity-90"
    >
      <path d="M10 14L20 4" />
      <path d="M14 4h6v6" />
      <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="#0f172a" className="h-3 w-3 translate-x-px">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
