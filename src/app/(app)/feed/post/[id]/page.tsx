import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FeedCard, type FeedItem } from "../../feed-card";
import { fetchOEmbedPreview } from "@/lib/oembed/server";
import {
  startConversationWithParent,
  startConversationWithFeedPostAuthor,
} from "@/app/(app)/messages/actions";

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

  const [{ data: post }, { data: viewerProfile }] = await Promise.all([
    supabase
      .from("feed_posts")
      .select(
        "id, post_type, author_id, player_id, birth_year, positions, description, cost_cents, duration_minutes, event_date, event_time, location, signup_url, created_at, city:cities(name), author:profiles(full_name), player:players(first_name, last_initial), highlight:player_highlights(url, caption, theme)"
      )
      .eq("id", id)
      .single(),
    supabase.from("profiles").select("role").eq("id", userData.user.id).single(),
  ]);

  // A missing row means it doesn't exist, expired, or RLS denied it --
  // same "nothing more specific to say than not found" reasoning as the
  // coach-facing player detail page.
  if (!post) {
    notFound();
  }

  const city = post.city as unknown as { name: string } | null;
  const author = post.author as unknown as { full_name: string } | null;
  const player = post.player as unknown as { first_name: string; last_initial: string } | null;
  const highlight = post.highlight as unknown as { url: string; caption: string | null; theme: string | null } | null;
  const viewerRole = viewerProfile?.role ?? null;

  const highlightPreview =
    post.post_type === "highlight" && highlight ? await fetchOEmbedPreview(highlight.url) : null;

  // A coach messaging the family behind a looking_for_team/guest_play
  // post -- no new discovery context needed, this reuses the same
  // player_id path search already uses. RLS on players decides what
  // comes back: a coach only ever sees this row if the player is open
  // and consented, which is exactly when messaging is actually allowed
  // (player_is_open_for_parent), so a returned row means the form is
  // safe to show and a missing one means it isn't -- no separate check
  // needed here.
  let messagePlayer: { id: string; first_name: string } | null = null;
  if (post.player_id && viewerRole === "coach") {
    const { data: playerRow } = await supabase
      .from("players")
      .select("id, first_name")
      .eq("id", post.player_id)
      .maybeSingle();
    messagePlayer = playerRow;
  }

  // A parent messaging the coach behind a coach-authored guest_play
  // ("need a guest player") or training post -- these never carry a
  // player_id. Deliberately excludes org_event: an organization can
  // never be a conversation's coach_id (CLAUDE.md section 9), so there
  // is no equivalent branch for it here or in the migration's RLS.
  const canMessageFeedPostAuthor =
    viewerRole === "parent" &&
    !post.player_id &&
    (post.post_type === "guest_play" || post.post_type === "training") &&
    post.author_id !== userData.user.id;

  const { data: likeRows } = await supabase
    .from("feed_post_likes")
    .select("profile_id")
    .eq("post_id", post.id);

  const likeCount = likeRows?.length ?? 0;
  const likedByMe = (likeRows ?? []).some((l) => l.profile_id === userData.user!.id);
  const canDelete = post.author_id === userData.user.id;

  const item: FeedItem =
    post.post_type === "highlight" && player && highlight
      ? {
          kind: "highlight",
          id: post.id,
          playerFirstName: player.first_name,
          playerLastInitial: player.last_initial,
          cityName: city?.name ?? "",
          caption: highlight.caption,
          theme: highlight.theme,
          thumbnailUrl: highlightPreview?.thumbnailUrl ?? null,
          linkUrl: highlight.url,
          createdAt: post.created_at,
          likeCount,
          likedByMe,
          canDelete,
        }
      : post.post_type === "org_event"
      ? {
          kind: "org_event",
          id: post.id,
          orgName: author?.full_name ?? "An organization",
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
            authorName: author?.full_name ?? "A coach",
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
            // No player_id means a coach posted it (they have no player
            // of their own to attach) -- a parent's post always has one.
            authorName: post.player_id ? null : author?.full_name ?? "A coach",
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
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link href="/feed" className="text-sm text-gray-500 underline">
        ← Back to feed
      </Link>
      <div className="mt-4">
        <FeedCard item={item} />
      </div>

      {messagePlayer ? (
        <div className="mt-6 border-t border-gray-200 pt-6">
          <h2 className="text-sm font-medium text-gray-900">
            Message the family
          </h2>
          <form
            action={startConversationWithParent.bind(null, messagePlayer.id)}
            className="mt-3 flex gap-2"
          >
            <textarea
              name="body"
              rows={2}
              required
              placeholder={`Introduce yourself and the opportunity at your club...`}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 self-start rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Send
            </button>
          </form>
        </div>
      ) : null}

      {canMessageFeedPostAuthor ? (
        <div className="mt-6 border-t border-gray-200 pt-6">
          <h2 className="text-sm font-medium text-gray-900">
            Message {author?.full_name ?? "the coach"}
          </h2>
          <form
            action={startConversationWithFeedPostAuthor.bind(null, post.id)}
            className="mt-3 flex gap-2"
          >
            <textarea
              name="body"
              rows={2}
              required
              placeholder="Ask for more information..."
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 self-start rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Send
            </button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
