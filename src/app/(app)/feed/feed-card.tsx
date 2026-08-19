import Link from "next/link";
import { LikeButton } from "./like-button";
import { ShareButton } from "./share-button";
import { ActionButton } from "@/components/ui/action-button";
import { formatTime } from "@/lib/format";
import { deleteFeedPost } from "./actions";
import { toggleRosterPostLike } from "../roster-posts/actions";

export type FeedItem =
  | {
      kind: "roster_spot";
      id: string;
      birthYear: number;
      positions: string[];
      clubName: string;
      clubCity: string;
      createdAt: string;
      likeCount: number;
      likedByMe: boolean;
    }
  | {
      kind: "looking_for_team" | "guest_play";
      id: string;
      birthYear: number | null;
      positions: string[];
      cityName: string;
      description: string;
      // Set only for a coach's "need a guest player" post — a parent's
      // looking_for_team/guest_play never carries an author name, per
      // CLAUDE.md section 9 ("never a name or photo in the feed card").
      // A coach's own name is already public (search, roster posts), so
      // showing it here doesn't create a new exposure.
      authorName: string | null;
      // Only ever set on guest_play (from either side) — looking_for_team
      // isn't an event with a date/place.
      eventDate: string | null;
      eventTime: string | null;
      location: string | null;
      signupUrl: string | null;
      createdAt: string;
      likeCount: number;
      likedByMe: boolean;
      canDelete: boolean;
    }
  | {
      kind: "org_event";
      id: string;
      orgName: string;
      cityName: string;
      description: string;
      eventDate: string | null;
      eventTime: string | null;
      location: string | null;
      signupUrl: string | null;
      createdAt: string;
      likeCount: number;
      likedByMe: boolean;
      canDelete: boolean;
    }
  | {
      kind: "training";
      id: string;
      authorName: string;
      cityName: string;
      birthYear: number | null;
      positions: string[];
      description: string;
      costCents: number | null;
      durationMinutes: number | null;
      eventDate: string | null;
      eventTime: string | null;
      location: string | null;
      signupUrl: string | null;
      createdAt: string;
      likeCount: number;
      likedByMe: boolean;
      canDelete: boolean;
    };

const KIND_LABEL: Record<FeedItem["kind"], string> = {
  roster_spot: "Roster spot",
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
  const formatted = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return time ? `${formatted} · ${formatTime(time)}` : formatted;
}

export function FeedCard({ item }: { item: FeedItem }) {
  const badge = (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${KIND_BADGE[item.kind]}`}
    >
      {KIND_LABEL[item.kind]}
    </span>
  );

  if (item.kind === "roster_spot") {
    return (
      <div className="rounded-lg border border-slate-200 p-4">
        <Link href={`/roster-posts/${item.id}`} className="block">
          <div className="flex items-center justify-between gap-2">
            {badge}
          </div>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {item.clubName} — {item.clubCity}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {item.birthYear} ·{" "}
            {(item.positions ?? []).join(", ") || "Any position"}
          </p>
        </Link>
        <div className="mt-3 flex gap-2">
          <LikeButton
            postId={item.id}
            likedByMe={item.likedByMe}
            likeCount={item.likeCount}
            toggleAction={toggleRosterPostLike}
          />
          <ShareButton href={`/roster-posts/${item.id}`} />
        </div>
      </div>
    );
  }

  const cost = item.kind === "training" ? formatCost(item.costCents) : null;
  const duration = item.kind === "training" ? formatDuration(item.durationMinutes) : null;
  const eventWhen = formatEventDate(item.eventDate, item.eventTime);

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-2">
        {badge}
        {item.canDelete ? (
          <ActionButton
            action={deleteFeedPost.bind(null, item.id)}
            label="Remove"
            pendingLabel="..."
            successMessage="Removed"
            variant="ghost"
            size="sm"
            confirmMessage="Remove this post?"
          />
        ) : null}
      </div>

      <Link href={`/feed/post/${item.id}`} className="block">
        {item.kind === "org_event" ? (
          <p className="mt-2 text-sm font-medium text-slate-900">
            {item.orgName} — {item.cityName}
          </p>
        ) : item.kind === "training" ? (
          <p className="mt-2 text-sm font-medium text-slate-900">
            {item.authorName} — {item.cityName}
          </p>
        ) : (
          <p className="mt-2 text-sm font-medium text-slate-900">
            {item.birthYear ?? "Any birth year"} ·{" "}
            {(item.positions ?? []).join(", ") || "Any position"} ·{" "}
            {item.cityName}
          </p>
        )}

        {item.kind === "training" && (item.birthYear || item.positions.length > 0) ? (
          <p className="mt-1 text-xs text-slate-500">
            {item.birthYear ?? "Any birth year"} ·{" "}
            {item.positions.join(", ") || "Any position"}
          </p>
        ) : null}

        {(item.kind === "looking_for_team" || item.kind === "guest_play") && item.authorName ? (
          <p className="mt-1 text-xs text-slate-500">Posted by {item.authorName}</p>
        ) : null}

        {item.kind === "training" && (cost || duration) ? (
          <p className="mt-1.5 text-sm font-medium text-slate-700">
            {[cost, duration].filter(Boolean).join(" · ")}
          </p>
        ) : null}

        {eventWhen || item.location ? (
          <p className="mt-1.5 text-xs font-medium text-slate-600">
            {[eventWhen, item.location].filter(Boolean).join(" · ")}
          </p>
        ) : null}

        <p className="mt-1.5 text-sm leading-6 text-slate-600">
          {item.description}
        </p>
      </Link>

      <div className="mt-3 flex flex-wrap gap-2">
        <LikeButton
          postId={item.id}
          likedByMe={item.likedByMe}
          likeCount={item.likeCount}
        />
        <ShareButton href={`/feed/post/${item.id}`} />
        {item.signupUrl ? (
          <a
            href={item.signupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-400"
          >
            Sign up ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}
