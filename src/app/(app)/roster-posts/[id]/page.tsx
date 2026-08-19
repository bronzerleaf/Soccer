import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startConversationWithCoach } from "@/app/(app)/messages/actions";
import { LikeButton } from "@/app/(app)/feed/like-button";
import { formatTime } from "@/lib/format";
import { toggleRosterPostLike } from "../actions";
import { Badge } from "@/components/ui/badge";
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
      <Link href="/feed" className="text-sm text-slate-500 underline">
        ← Back to feed
      </Link>

      <Card className="mt-4">
        <div className="flex items-center gap-3">
          <ClubCrest name={club?.name ?? "Club"} size={48} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold text-slate-900">
                {club?.name}
              </h1>
              <Badge tone="accent">Club</Badge>
            </div>
            <p className="text-sm text-slate-500">{club?.city}</p>
          </div>
        </div>

        <div className="mt-4">
          <InfoTileRow>
            <InfoTile value={likeCount} label={likeCount === 1 ? "Family interested" : "Families interested"} />
            <InfoTile value={(post.positions ?? []).length || "Any"} label="Positions needed" />
            <InfoTile value={post.birth_year} label="Birth year" />
          </InfoTileRow>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <LikeButton
            postId={post.id}
            likedByMe={likedByMe}
            likeCount={likeCount}
            toggleAction={toggleRosterPostLike}
          />
          {post.signup_url ? (
            <a
              href={post.signup_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400"
            >
              Sign up ↗
            </a>
          ) : null}
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-sm font-semibold text-slate-900">Opportunity details</h2>
        <dl className="mt-3 space-y-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Position(s) needed
            </dt>
            <dd className="mt-0.5 text-sm text-slate-700">
              {(post.positions ?? []).join(", ") || "Any position"}
            </dd>
          </div>
          {post.tryout_date ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Tryout date
              </dt>
              <dd className="mt-0.5 text-sm text-slate-700">
                {new Date(post.tryout_date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                {post.tryout_time ? ` at ${formatTime(post.tryout_time)}` : ""}
              </dd>
            </div>
          ) : null}
          {post.location ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Location
              </dt>
              <dd className="mt-0.5 text-sm text-slate-700">{post.location}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Description
            </dt>
            <dd className="mt-0.5 text-sm leading-6 text-slate-700">
              {post.description}
            </dd>
          </div>
        </dl>
      </Card>

      {profile?.role === "parent" ? (
        <Card className="mt-4">
          <h2 className="text-sm font-semibold text-slate-900">
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
              className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 self-start rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Send
            </button>
          </form>
        </Card>
      ) : null}
    </main>
  );
}
