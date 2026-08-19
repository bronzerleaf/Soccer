import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startConversationWithCoach } from "@/app/(app)/messages/actions";
import { LikeButton } from "@/app/(app)/feed/like-button";
import { formatTime } from "@/lib/format";
import { toggleRosterPostLike } from "../actions";

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

      <h1 className="mt-3 text-xl font-semibold text-slate-900">
        {club?.name} — {club?.city}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {post.birth_year} ·{" "}
        {(post.positions ?? []).join(", ") || "Any position"}
      </p>

      {post.tryout_date ? (
        <p className="mt-4 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Tryout date:</span>{" "}
          {new Date(post.tryout_date).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
          {post.tryout_time ? ` at ${formatTime(post.tryout_time)}` : ""}
        </p>
      ) : null}

      {post.location ? (
        <p className="mt-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Location:</span>{" "}
          {post.location}
        </p>
      ) : null}

      <p className="mt-4 text-sm leading-6 text-slate-700">
        {post.description}
      </p>

      {post.signup_url ? (
        <a
          href={post.signup_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Sign up ↗
        </a>
      ) : null}

      <div className="mt-4">
        <LikeButton
          postId={post.id}
          likedByMe={likedByMe}
          likeCount={likeCount}
          toggleAction={toggleRosterPostLike}
        />
      </div>

      {profile?.role === "parent" ? (
        <div className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="text-sm font-medium text-slate-900">
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
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 self-start rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Send
            </button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
