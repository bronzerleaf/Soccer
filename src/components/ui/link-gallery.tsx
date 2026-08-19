import type { ReactNode } from "react";
import type { OEmbedPreview } from "@/lib/oembed/server";
import { detectPlatform, type PlatformKind } from "@/lib/oembed/platform";
import { themeMeta } from "@/lib/highlight-themes";

export type Highlight = {
  id: string;
  url: string;
  caption: string | null;
  theme: string | null;
  show_in_feed?: boolean;
};

export function LinkGallery({
  highlights,
  previews,
}: {
  highlights: Highlight[];
  previews: Record<string, OEmbedPreview | null>;
}) {
  if (highlights.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {highlights.map((highlight) => (
        <HighlightTile
          key={highlight.id}
          highlight={highlight}
          preview={previews[highlight.id] ?? null}
        />
      ))}
    </div>
  );
}

export function HighlightTile({
  highlight,
  preview,
  actions,
}: {
  highlight: Highlight;
  preview: OEmbedPreview | null;
  actions?: ReactNode;
}) {
  const platform = detectPlatform(highlight.url);
  const theme = themeMeta(highlight.theme);
  const caption =
    highlight.caption ??
    preview?.title ??
    (platform.kind === "photo" ? `View on ${platform.name}` : `Open on ${platform.name}`);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md">
      <a href={highlight.url} target="_blank" rel="noopener noreferrer" className="block">
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
          {theme ? (
            <span
              className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm"
              style={{ background: theme.color }}
            >
              {theme.label}
            </span>
          ) : null}
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
      {actions ? <div className="absolute right-1.5 top-1.5">{actions}</div> : null}
    </div>
  );
}

function PlatformGlyph({ kind }: { kind: PlatformKind }) {
  if (kind === "photo") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" className="h-8 w-8 opacity-90">
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
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 opacity-90">
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
