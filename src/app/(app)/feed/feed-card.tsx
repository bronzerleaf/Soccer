import Link from "next/link";
import { LikeButton } from "./like-button";
import { ShareButton } from "./share-button";
import { ActionButton } from "@/components/ui/action-button";
import { ClubCrest } from "@/components/ui/club-crest";
import { formatTime } from "@/lib/format";
import { deleteFeedPost } from "./actions";
import { toggleRosterPostLike } from "../roster-posts/actions";

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5 shrink-0">
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5 shrink-0">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

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
  roster_spot: "bg-green-50 text-green-700",
  looking_for_team: "bg-blue-50 text-blue-700",
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
      <div className="rounded-[18px] border border-gray-200 bg-white p-4 shadow-[0_3px_16px_rgba(17,24,39,0.07)]">
        <Link href={`/roster-posts/${item.id}`} className="block">
          <div className="flex items-start gap-3">
            <ClubCrest name={item.clubName} size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold text-gray-900">{item.clubName}</p>
                {badge}
              </div>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                <PinIcon />
                {item.clubCity}
              </p>
            </div>
          </div>
          <p className="mt-2.5 text-sm text-gray-600">
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
    <div className="rounded-[18px] border border-gray-200 bg-white p-4 shadow-[0_3px_16px_rgba(17,24,39,0.07)]">
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
          <p className="mt-2 text-sm font-medium text-gray-900">
            {item.orgName} — {item.cityName}
          </p>
        ) : item.kind === "training" ? (
          <p className="mt-2 text-sm font-medium text-gray-900">
            {item.authorName} — {item.cityName}
          </p>
        ) : (
          <p className="mt-2 text-sm font-medium text-gray-900">
            {item.birthYear ?? "Any birth year"} ·{" "}
            {(item.positions ?? []).join(", ") || "Any position"} ·{" "}
            {item.cityName}
          </p>
        )}

        {item.kind === "training" && (item.birthYear || item.positions.length > 0) ? (
          <p className="mt-1 text-xs text-gray-500">
            {item.birthYear ?? "Any birth year"} ·{" "}
            {item.positions.join(", ") || "Any position"}
          </p>
        ) : null}

        {(item.kind === "looking_for_team" || item.kind === "guest_play") && item.authorName ? (
          <p className="mt-1 text-xs text-gray-500">Posted by {item.authorName}</p>
        ) : null}

        {item.kind === "training" && (cost || duration) ? (
          <p className="mt-1.5 text-sm font-medium text-gray-700">
            {[cost, duration].filter(Boolean).join(" · ")}
          </p>
        ) : null}

        {eventWhen || item.location ? (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-gray-600">
            {eventWhen ? (
              <span className="flex items-center gap-1">
                <CalendarIcon />
                {eventWhen}
              </span>
            ) : null}
            {item.location ? (
              <span className="flex items-center gap-1">
                <PinIcon />
                {item.location}
              </span>
            ) : null}
          </p>
        ) : null}

        <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-gray-600">
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
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-400"
          >
            Sign up ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}
