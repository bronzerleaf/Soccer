import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startConversationWithCoach } from "@/app/(app)/messages/actions";
import { LikeButton } from "@/app/(app)/feed/like-button";
import { formatTime } from "@/lib/format";
import { toggleRosterPostLike } from "../actions";
import { Badge, VerifiedMark } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ClubCrest } from "@/components/ui/club-crest";
import { InfoTile, InfoTileRow } from "@/components/ui/info-tile";

export default async function RosterPostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: post } = await supabase
    .from("roster_posts")
    .select(
      "id, birth_year, positions, tryout_date, tryout_time, location, signup_url, description, expires_at, club:clubs(name, city)"
    )
    .eq("id", id)
    .single();

  if (!post) {
    notFound();
  }

  const [{ data: profile }, { data: likeRows }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", userData.user.id).single(),
    supabase.from("roster_post_likes").select("profile_id").eq("post_id", post.id),
  ]);

  const likeCount = likeRows?.length ?? 0;
  const likedByMe = (likeRows ?? []).some((l) => l.profile_id === userData.user!.id);

  const club = post.club as unknown as { name: string; city: string } | null;

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link href="/feed" className="text-sm text-gray-500 underline">
        ← Back to feed
      </Link>

      <Card className="mt-4">
        <div className="flex items-center gap-3">
          <ClubCrest name={club?.name ?? "Club"} size={48} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold text-gray-900">
                {club?.name}
              </h1>
              <VerifiedMark />
              <Badge tone="neutral">Club</Badge>
            </div>
            <p className="text-sm text-gray-500">{club?.city}</p>
          </div>
        </div>

        <div className="mt-4">
          <InfoTileRow>
            <InfoTile value={likeCount} label={likeCount === 1 ? "Family interested" : "Families interested"} />
            <InfoTile value={(post.positions ?? []).length || "Any"} label="Positions needed" />
            <InfoTile value={post.birth_year} label="Birth year" />
          </InfoTileRow>
        </div>

        <div className="mt-4 flex gap-2">
          {profile?.role === "parent" ? (
            <a
              href="#message-club"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 px-3 py-3 text-sm font-semibold text-white hover:bg-green-700"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M2 12 21 3l-6 19-4-8-9-2Z" />
              </svg>
              Message the Club
            </a>
          ) : null}
          <LikeButton
            postId={post.id}
            likedByMe={likedByMe}
            likeCount={likeCount}
            toggleAction={toggleRosterPostLike}
          />
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-sm font-semibold text-gray-900">Opportunity details</h2>
        <div className="mt-3.5 space-y-3.5">
          <DetailRow
            label="Position(s) needed"
            value={(post.positions ?? []).join(", ") || "Any position"}
            icon={
              <path d="M9 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8.5 1.5a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6ZM3.5 20c.5-3.4 2.7-5.5 5.5-5.5s5 2.1 5.5 5.5M15.2 14.8c2.2.4 3.6 2.1 4 5.2" />
            }
          />
          {post.tryout_date ? (
            <DetailRow
              label="Tryout Date & Time"
              value={`${new Date(post.tryout_date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}${post.tryout_time ? ` · ${formatTime(post.tryout_time)}` : ""}`}
              icon={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>}
            />
          ) : null}
          {post.location ? (
            <DetailRow
              label="Location"
              value={post.location}
              icon={<><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.3" /></>}
            />
          ) : null}
          <DetailRow
            label="Description"
            value={post.description}
            icon={<><rect x="5.5" y="4.5" width="13" height="16" rx="1.5" /><path d="M8.5 11h7M8.5 14.5h7M8.5 17.5h4" /></>}
          />
        </div>
        {post.signup_url ? (
          <a
            href={post.signup_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block rounded-xl border border-gray-900 px-3 py-2.5 text-center text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            Sign Up ↗
          </a>
        ) : null}
      </Card>

      {profile?.role === "parent" ? (
        <Card id="message-club" className="mt-4 scroll-mt-6">
          <h2 className="text-sm font-semibold text-gray-900">
            Message the club
          </h2>
          <form
            action={startConversationWithCoach.bind(null, post.id)}
            className="mt-3 flex gap-2"
          >
            <textarea
              name="body"
              rows={2}
              required
              placeholder="Introduce your player and ask about this spot..."
              className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 self-start rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Send
            </button>
          </form>
        </Card>
      ) : null}
    </main>
  );
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-green-50 text-green-700">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          {icon}
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-gray-900">{label}</p>
        <p className="mt-0.5 text-[13px] leading-6 text-gray-500">{value}</p>
      </div>
    </div>
  );
}
