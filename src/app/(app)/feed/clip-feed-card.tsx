import { LikeButton } from "./like-button";
import { toggleHighlightLike, addHighlightComment, deleteHighlightComment } from "./clip-actions";
import { detectPlatform } from "@/lib/oembed/platform";
import { themeMeta } from "@/lib/highlight-themes";
import type { OEmbedPreview } from "@/lib/oembed/server";

export type ClipFeedComment = {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
  can_delete: boolean;
};

export type ClipFeedItem = {
  highlightId: string;
  playerId: string;
  firstName: string;
  lastInitial: string;
  birthYear: number;
  positions: string[];
  levelOfPlay: string | null;
  yearsExperience: number | null;
  teamName: string | null;
  teamVerified: boolean;
  url: string;
  caption: string | null;
  theme: string | null;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  comments: ClipFeedComment[];
};

export function ClipFeedCard({
  clip,
  preview,
}: {
  clip: ClipFeedItem;
  preview: OEmbedPreview | null;
}) {
  const platform = detectPlatform(clip.url);
  const theme = themeMeta(clip.theme);
  const displayCaption = clip.caption || preview?.title || "Soccer clip";

  return (
    <article className="pitch-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-slate-100 text-lg font-black text-emerald-700">
          {clip.firstName.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-black text-[#0b1736]">{clip.firstName} {clip.lastInitial}.</p>
            {clip.teamVerified ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">✓ team verified</span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {(clip.positions ?? []).join(" · ") || "Position not listed"} · {clip.birthYear}
            {clip.teamName ? ` · ${clip.teamName}` : ""}
          </p>
        </div>
      </div>

      <a href={clip.url} target="_blank" rel="noopener noreferrer" className="mt-3 block">
        <div
          className="relative aspect-video w-full overflow-hidden bg-slate-900"
          style={preview ? undefined : { background: platform.gradient }}
        >
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/10" />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-center text-white">
              <div>
                <div className="text-4xl">▶</div>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] opacity-90">Open on {platform.name}</p>
              </div>
            </div>
          )}
          {theme ? (
            <span className="absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-black text-white shadow-sm" style={{ background: theme.color }}>
              {theme.label}
            </span>
          ) : null}
          <span className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-sm text-[#0b1736] shadow-lg">▶</span>
        </div>
      </a>

      <div className="p-4">
        <p className="text-sm leading-6 text-slate-700">{displayCaption}</p>
        <p className="mt-1 text-[11px] font-semibold text-slate-400">{preview?.providerName ?? platform.name}</p>

        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
          <LikeButton postId={clip.highlightId} likedByMe={clip.likedByMe} likeCount={clip.likeCount} toggleAction={toggleHighlightLike} />
          <span className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {clip.comments.length > 0 ? `${clip.comments.length} comment${clip.comments.length === 1 ? "" : "s"}` : "Comment"}
          </span>
        </div>

        {clip.comments.length > 0 ? (
          <div className="mt-3 space-y-2">
            {clip.comments.slice(-4).map((comment) => (
              <div key={comment.id} className="rounded-xl bg-slate-50 px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black text-slate-700">{comment.author_name}</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-600">{comment.body}</p>
                  </div>
                  {comment.can_delete ? (
                    <form action={deleteHighlightComment.bind(null, comment.id)}>
                      <button type="submit" className="text-[10px] font-bold text-slate-400 hover:text-red-600">Remove</button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <form action={addHighlightComment.bind(null, clip.highlightId)} className="mt-3 flex gap-2">
          <input name="body" maxLength={500} required placeholder="Add a comment..." className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-900 outline-none focus:border-emerald-400" />
          <button type="submit" className="rounded-full bg-[#0b1736] px-4 py-2 text-xs font-bold text-white">Post</button>
        </form>
      </div>
    </article>
  );
}
