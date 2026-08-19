import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FeedCard, type FeedItem } from "../../feed-card";
import { OpportunityInterestPanel } from "../../opportunity-interest-panel";
import { startConversationWithParent, startConversationWithFeedPostAuthor } from "@/app/(app)/messages/actions";

export default async function FeedPostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const [{ data: post }, { data: viewerProfile }] = await Promise.all([
    supabase
      .from("feed_posts")
      .select("id, post_type, author_id, player_id, birth_year, positions, description, cost_cents, duration_minutes, event_date, event_time, location, signup_url, created_at, city:cities(name), author:profiles(full_name, role)")
      .eq("id", id)
      .single(),
    supabase.from("profiles").select("role").eq("id", userData.user.id).single(),
  ]);
  if (!post) notFound();

  const city = post.city as unknown as { name: string } | null;
  const author = post.author as unknown as { full_name: string; role: string } | null;
  const viewerRole = viewerProfile?.role ?? null;

  let messagePlayer: { id: string; first_name: string } | null = null;
  if (post.player_id && viewerRole === "coach") {
    const { data: playerRow } = await supabase.from("players").select("id, first_name").eq("id", post.player_id).maybeSingle();
    messagePlayer = playerRow;
  }

  const canMessageFeedPostAuthor =
    viewerRole === "parent" &&
    author?.role === "coach" &&
    !post.player_id &&
    (post.post_type === "guest_play" || post.post_type === "training") &&
    post.author_id !== userData.user.id;

  const { data: likeRows } = await supabase.from("feed_post_likes").select("profile_id").eq("post_id", post.id);
  const likeCount = likeRows?.length ?? 0;
  const likedByMe = (likeRows ?? []).some((row) => row.profile_id === userData.user!.id);
  const canDelete = post.author_id === userData.user.id;

  const item: FeedItem = post.post_type === "org_event"
    ? {
        kind: "org_event",
        id: post.id,
        orgName: author?.full_name ?? "Organization",
        cityName: city?.name ?? "",
        description: post.description,
        eventDate: post.event_date,
        eventTime: post.event_time,
        location: post.location,
        signupUrl: post.signup_url,
        createdAt: post.created_at,
        likeCount,
        likedByMe,
        canDelete,
      }
    : post.post_type === "training"
      ? {
          kind: "training",
          id: post.id,
          authorName: author?.full_name ?? "Soccer professional",
          cityName: city?.name ?? "",
          birthYear: post.birth_year,
          positions: post.positions ?? [],
          description: post.description,
          costCents: post.cost_cents,
          durationMinutes: post.duration_minutes,
          eventDate: post.event_date,
          eventTime: post.event_time,
          location: post.location,
          signupUrl: post.signup_url,
          createdAt: post.created_at,
          likeCount,
          likedByMe,
          canDelete,
        }
      : {
          kind: post.post_type as "looking_for_team" | "guest_play",
          id: post.id,
          birthYear: post.birth_year,
          positions: post.positions ?? [],
          cityName: city?.name ?? "",
          description: post.description,
          authorName: post.player_id ? null : author?.full_name ?? "Soccer professional",
          eventDate: post.event_date,
          eventTime: post.event_time,
          location: post.location,
          signupUrl: post.signup_url,
          createdAt: post.created_at,
          likeCount,
          likedByMe,
          canDelete,
        };

  return (
    <main className="mx-auto max-w-lg px-4 pb-32 pt-7 sm:px-6">
      <Link href="/feed" className="text-sm font-semibold text-slate-500">← Back to feed</Link>
      <div className="mt-5"><FeedCard item={item} /></div>

      {!post.player_id && (post.post_type === "guest_play" || post.post_type === "training" || post.post_type === "org_event") ? (
        <OpportunityInterestPanel kind="feed" targetId={post.id} />
      ) : null}

      {messagePlayer ? (
        <section className="pitch-card mt-6 p-5">
          <h2 className="text-base font-black text-[#0b1736]">Message the family</h2>
          <form action={startConversationWithParent.bind(null, messagePlayer.id)} className="mt-3">
            <textarea name="body" rows={3} required placeholder="Introduce yourself and the opportunity..." className="block w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
            <button type="submit" className="mt-2 w-full rounded-xl bg-[#0b1736] px-4 py-3 text-sm font-black text-white">Send message</button>
          </form>
        </section>
      ) : null}

      {canMessageFeedPostAuthor ? (
        <section className="pitch-card mt-6 p-5">
          <h2 className="text-base font-black text-[#0b1736]">Message {author?.full_name ?? "the coach"}</h2>
          <form action={startConversationWithFeedPostAuthor.bind(null, post.id)} className="mt-3">
            <textarea name="body" rows={3} required placeholder="Ask for more information..." className="block w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
            <button type="submit" className="mt-2 w-full rounded-xl bg-[#0b1736] px-4 py-3 text-sm font-black text-white">Send message</button>
          </form>
        </section>
      ) : null}
    </main>
  );
}
