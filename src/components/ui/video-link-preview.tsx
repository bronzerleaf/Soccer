import type { OEmbedPreview } from "@/lib/oembed/server";

// Renders a thumbnail + play-button card when an oEmbed preview was
// fetched, falling back to the original plain-link rendering otherwise
// (unknown provider, fetch failure, timeout). Never hosts the video
// itself — just a thumbnail URL supplied by the provider's own oEmbed
// response, same as any link-out preview.
export function VideoLinkPreview({
  url,
  preview,
}: {
  url: string;
  preview: OEmbedPreview | null;
}) {
  if (!preview) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-sm text-slate-700 underline"
      >
        {url}
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 overflow-hidden rounded-lg border border-slate-200 transition-colors hover:border-slate-300"
    >
      <div className="relative h-16 w-24 shrink-0 bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90">
            <svg viewBox="0 0 24 24" className="ml-0.5 h-3.5 w-3.5 fill-slate-900">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </div>
      <div className="min-w-0 flex-1 py-2 pr-3">
        <p className="truncate text-sm font-medium text-slate-900">
          {preview.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {preview.providerName ?? url}
        </p>
      </div>
    </a>
  );
}
