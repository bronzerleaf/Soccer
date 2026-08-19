import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startConversationWithCoach } from "@/app/(app)/messages/actions";
import { LikeButton } from "@/app/(app)/feed/like-button";
import { OpportunityInterestPanel } from "@/app/(app)/feed/opportunity-interest-panel";
import { formatTime } from "@/lib/format";
import { toggleRosterPostLike } from "../actions";

export default async function RosterPostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: post } = await supabase
    .from("roster_posts")
    .select("id, birth_year, positions, tryout_date, tryout_time, location, signup_url, description, expires_at, club:clubs(name, city)")
    .eq("id", id)
    .single();
  if (!post) notFound();

  const [{ data: profile }, { data: likeRows }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", userData.user.id).single(),
    supabase.from("roster_post_likes").select("profile_id").eq("post_id", post.id),
  ]);
  const likeCount = likeRows?.length ?? 0;
  const likedByMe = (likeRows ?? []).some((row) => row.profile_id === userData.user!.id);
  const club = post.club as unknown as { name: string; city: string } | null;

  return (
    <main className="mx-auto max-w-lg px-4 pb-32 pt-7 sm:px-6">
      <Link href="/feed" className="text-sm font-semibold text-slate-500">← Back to feed</Link>

      <section className="pitch-card mt-5 p-5">
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700">Open roster spot</span>
        <h1 className="mt-3 text-2xl font-black text-[#0b1736]">{club?.name}</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">{club?.city}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{post.birth_year}</span>
          {(post.positions ?? []).map((position) => <span key={position} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{position}</span>)}
        </div>

        {post.tryout_date ? (
          <p className="mt-4 text-sm text-slate-700"><strong>Tryout:</strong> {new Date(`${post.tryout_date}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}{post.tryout_time ? ` at ${formatTime(post.tryout_time)}` : ""}</p>
        ) : null}
        {post.location ? <p className="mt-1 text-sm text-slate-700"><strong>Location:</strong> {post.location}</p> : null}
        <p className="mt-4 text-sm leading-6 text-slate-700">{post.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <LikeButton postId={post.id} likedByMe={likedByMe} likeCount={likeCount} toggleAction={toggleRosterPostLike} />
          {post.signup_url ? <a href={post.signup_url} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#0b1736] px-4 py-2 text-xs font-bold text-white">Sign up ↗</a> : null}
        </div>
      </section>

      <OpportunityInterestPanel kind="roster" targetId={post.id} />

      {profile?.role === "parent" ? (
        <section className="pitch-card mt-6 p-5">
          <h2 className="text-base font-black text-[#0b1736]">Message the club</h2>
          <p className="mt-1 text-xs text-slate-500">You can show interest above, message the coach, or do both.</p>
          <form action={startConversationWithCoach.bind(null, post.id)} className="mt-3">
            <textarea name="body" rows={3} required placeholder="Introduce your player and ask about this opportunity..." className="block w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
            <button type="submit" className="mt-2 w-full rounded-xl bg-[#0b1736] px-4 py-3 text-sm font-black text-white">Send message</button>
          </form>
        </section>
      ) : null}
    </main>
  );
}
