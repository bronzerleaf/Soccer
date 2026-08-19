import Link from "next/link";
import { LikeButton } from "./like-button";
import { ShareButton } from "./share-button";
import { ActionButton } from "@/components/ui/action-button";
import { formatTime } from "@/lib/format";
import { deleteFeedPost } from "./actions";
import { toggleRosterPostLike } from "../roster-posts/actions";

export type FeedItem =
  | { kind: "roster_spot"; id: string; birthYear: number; positions: string[]; clubName: string; clubCity: string; createdAt: string; likeCount: number; likedByMe: boolean }
  | { kind: "looking_for_team" | "guest_play"; id: string; birthYear: number | null; positions: string[]; cityName: string; description: string; authorName: string | null; eventDate: string | null; eventTime: string | null; location: string | null; signupUrl: string | null; createdAt: string; likeCount: number; likedByMe: boolean; canDelete: boolean }
  | { kind: "org_event"; id: string; orgName: string; cityName: string; description: string; eventDate: string | null; eventTime: string | null; location: string | null; signupUrl: string | null; createdAt: string; likeCount: number; likedByMe: boolean; canDelete: boolean }
  | { kind: "training"; id: string; authorName: string; cityName: string; birthYear: number | null; positions: string[]; description: string; costCents: number | null; durationMinutes: number | null; eventDate: string | null; eventTime: string | null; location: string | null; signupUrl: string | null; createdAt: string; likeCount: number; likedByMe: boolean; canDelete: boolean };

const KIND_LABEL: Record<FeedItem["kind"], string> = {
  roster_spot: "Open roster spot",
  looking_for_team: "Looking for a team",
  guest_play: "Guest play",
  org_event: "Tournament / event",
  training: "Training / event",
};

const KIND_BADGE: Record<FeedItem["kind"], string> = {
  roster_spot: "bg-blue-50 text-blue-700",
  looking_for_team: "bg-emerald-50 text-emerald-700",
  guest_play: "bg-amber-50 text-amber-800",
  org_event: "bg-purple-50 text-purple-700",
  training: "bg-teal-50 text-teal-700",
};

const KIND_ICON: Record<FeedItem["kind"], string> = {
  roster_spot: "⚽",
  looking_for_team: "↗",
  guest_play: "★",
  org_event: "◉",
  training: "+",
};

function formatCost(costCents: number | null): string | null {
  if (costCents === null) return null;
  const dollars = costCents / 100;
  return `$${Number.isInteger(dollars) ? dollars.toString() : dollars.toFixed(2)}`;
}

function formatDuration(minutes: number | null): string | null {
  if (minutes === null) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

function formatEventDate(date: string | null, time: string | null): string | null {
  if (!date) return null;
  const formatted = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return time ? `${formatted} · ${formatTime(time)}` : formatted;
}

function timeAgo(createdAt: string): string {
  const delta = Math.max(0, Date.now() - new Date(createdAt).getTime());
  const minutes = Math.floor(delta / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function CardHeader({ item, title, subtitle }: { item: FeedItem; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#0b1736,#153c61)] text-lg font-black text-white shadow-sm">
        {KIND_ICON[item.kind]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#0b1736]">{title}</p>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{subtitle}</p>
          </div>
          <span className="shrink-0 text-[10px] font-semibold text-slate-400">{timeAgo(item.createdAt)}</span>
        </div>
        <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-[10px] font-black ${KIND_BADGE[item.kind]}`}>{KIND_LABEL[item.kind]}</span>
      </div>
    </div>
  );
}

export function FeedCard({ item }: { item: FeedItem }) {
  if (item.kind === "roster_spot") {
    return (
      <article className="pitch-card p-4">
        <Link href={`/roster-posts/${item.id}`} className="block">
          <CardHeader item={item} title={item.clubName} subtitle={item.clubCity || "Club opportunity"} />
          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <h3 className="text-base font-black text-[#0b1736]">{item.birthYear} roster opportunity</h3>
            <p className="mt-1 text-sm text-slate-600">Seeking {(item.positions ?? []).join(", ") || "players in any position"}.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 shadow-sm">{item.birthYear}</span>
              {(item.positions ?? []).slice(0, 3).map((position) => <span key={position} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 shadow-sm">{position}</span>)}
            </div>
          </div>
        </Link>
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
          <LikeButton postId={item.id} likedByMe={item.likedByMe} likeCount={item.likeCount} toggleAction={toggleRosterPostLike} />
          <ShareButton href={`/roster-posts/${item.id}`} />
          <Link href={`/roster-posts/${item.id}`} className="ml-auto rounded-full bg-[#0b1736] px-3 py-1.5 text-xs font-black text-white">View opportunity</Link>
        </div>
      </article>
    );
  }

  const cost = item.kind === "training" ? formatCost(item.costCents) : null;
  const duration = item.kind === "training" ? formatDuration(item.durationMinutes) : null;
  const eventWhen = formatEventDate(item.eventDate, item.eventTime);
  const title = item.kind === "org_event" ? item.orgName : item.kind === "training" ? item.authorName : item.authorName ?? (item.kind === "guest_play" ? "Guest play opportunity" : "Soccer family");
  const subtitle = item.kind === "org_event" || item.kind === "training" ? item.cityName : `${item.birthYear ?? "Any age"} · ${item.cityName}`;

  return (
    <article className="pitch-card p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1"><CardHeader item={item} title={title} subtitle={subtitle} /></div>
        {item.canDelete ? (
          <ActionButton action={deleteFeedPost.bind(null, item.id)} label="•••" pendingLabel="..." successMessage="Removed" variant="ghost" size="sm" confirmMessage="Remove this post?" />
        ) : null}
      </div>

      <Link href={`/feed/post/${item.id}`} className="mt-4 block">
        {item.kind !== "org_event" ? (
          <div className="flex flex-wrap gap-2">
            {item.kind === "training" && item.birthYear ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{item.birthYear}</span> : null}
            {item.kind !== "training" && item.birthYear ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{item.birthYear}</span> : null}
            {(item.positions ?? []).slice(0, 3).map((position) => <span key={position} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{position}</span>)}
            {cost ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">{cost}</span> : null}
            {duration ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">{duration}</span> : null}
          </div>
        ) : null}

        <p className="mt-3 text-sm leading-6 text-slate-700">{item.description}</p>

        {eventWhen || item.location ? (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold text-slate-600">
            <span className="text-emerald-600">●</span> {[eventWhen, item.location].filter(Boolean).join(" · ")}
          </div>
        ) : null}
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <LikeButton postId={item.id} likedByMe={item.likedByMe} likeCount={item.likeCount} />
        <ShareButton href={`/feed/post/${item.id}`} />
        {item.signupUrl ? <a href={item.signupUrl} target="_blank" rel="noopener noreferrer" className="ml-auto rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-black text-white">Sign up ↗</a> : null}
      </div>
    </article>
  );
}
