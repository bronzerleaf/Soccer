import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { ActionButton } from "@/components/ui/action-button";
import { removeFeedPostAsAdmin } from "./actions";

const KIND_LABEL: Record<string, string> = {
  looking_for_team: "Looking for a team",
  guest_play: "Guest play",
  org_event: "Tournament / event",
};

export default async function AdminFeedPostsPage() {
  const { supabase } = await requireAdmin();

  const { data: posts } = await supabase
    .from("feed_posts")
    .select(
      "id, post_type, birth_year, positions, description, expires_at, city:cities(name), author:profiles(full_name, email)"
    )
    .order("created_at", { ascending: false });

  // eslint-disable-next-line react-hooks/purity -- Server Component, computed fresh per request
  const now = Date.now();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/admin" className="text-sm text-gray-500 underline">
        ← Admin
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-gray-900">
        Local feed posts
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Looking-for-team, guest-play, and tournament/event listings from the
        local feed. Roster spots are moderated separately.
      </p>

      {posts && posts.length > 0 ? (
        <ul className="mt-8 space-y-4">
          {posts.map((post) => {
            const city = post.city as unknown as { name: string } | null;
            const author = post.author as unknown as {
              full_name: string;
              email: string;
            } | null;
            const isExpired = new Date(post.expires_at).getTime() <= now;

            return (
              <li
                key={post.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {KIND_LABEL[post.post_type] ?? post.post_type} —{" "}
                    {city?.name}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      isExpired
                        ? "bg-gray-100 text-gray-600"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {isExpired ? "Expired" : "Active"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {post.post_type === "org_event"
                    ? `posted by ${author?.full_name} (${author?.email})`
                    : `${post.birth_year ?? "Any birth year"} · ${
                        (post.positions ?? []).join(", ") || "Any position"
                      }`}
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  {post.description}
                </p>
                <div className="mt-3">
                  <ActionButton
                    action={removeFeedPostAsAdmin.bind(null, post.id)}
                    label="Remove"
                    pendingLabel="Removing..."
                    successMessage="Post removed"
                    confirmMessage="Remove this post?"
                    variant="danger"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-gray-600">No feed posts yet.</p>
      )}
    </main>
  );
}
