import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FeedCard, type FeedItem } from "../../feed-card";

export default async function FeedPostDetailPage({
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
    .from("feed_posts")
    .select(
      "id, post_type, author_id, player_id, birth_year, positions, description, cost_cents, duration_minutes, created_at, city:cities(name), author:profiles(full_name)"
    )
    .eq("id", id)
    .single();

  // A missing row means it doesn't exist, expired, or RLS denied it --
  // same "nothing more specific to say than not found" reasoning as the
  // coach-facing player detail page.
  if (!post) {
    notFound();
  }

  const city = post.city as unknown as { name: string } | null;
  const author = post.author as unknown as { full_name: string } | null;

  const { data: likeRows } = await supabase
    .from("feed_post_likes")
    .select("profile_id")
    .eq("post_id", post.id);

  const likeCount = likeRows?.length ?? 0;
  const likedByMe = (likeRows ?? []).some((l) => l.profile_id === userData.user!.id);
  const canDelete = post.author_id === userData.user.id;

  const item: FeedItem =
    post.post_type === "org_event"
      ? {
          kind: "org_event",
          id: post.id,
          orgName: author?.full_name ?? "An organization",
          cityName: city?.name ?? "",
          description: post.description,
          createdAt: post.created_at,
          likeCount,
          likedByMe,
          canDelete,
        }
      : post.post_type === "training"
        ? {
            kind: "training",
            id: post.id,
            authorName: author?.full_name ?? "A coach",
            cityName: city?.name ?? "",
            birthYear: post.birth_year,
            positions: post.positions ?? [],
            description: post.description,
            costCents: post.cost_cents,
            durationMinutes: post.duration_minutes,
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
            // No player_id means a coach posted it (they have no player
            // of their own to attach) -- a parent's post always has one.
            authorName: post.player_id ? null : author?.full_name ?? "A coach",
            createdAt: post.created_at,
            likeCount,
            likedByMe,
            canDelete,
          };

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link href="/feed" className="text-sm text-slate-500 underline">
        ← Back to feed
      </Link>
      <div className="mt-4">
        <FeedCard item={item} />
      </div>
    </main>
  );
}
