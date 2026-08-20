import Link from "next/link";
import { requireVerifiedCoach } from "@/lib/coach";
import { ActionButton } from "@/components/ui/action-button";
import { expireRosterPost, deleteRosterPost } from "../actions";

export default async function MyRosterPostsPage() {
  const { supabase, coachId } = await requireVerifiedCoach();

  const { data: posts } = await supabase
    .from("roster_posts")
    .select("id, birth_year, positions, tryout_date, description, expires_at")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false });

  // Server Component, computed fresh per request — the "impure function"
  // lint rule is aimed at client re-renders, not this.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Your roster posts
        </h1>
        <Link
          href="/roster-posts/new"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
        >
          New post
        </Link>
      </div>

      {posts && posts.length > 0 ? (
        <ul className="mt-8 space-y-4">
          {posts.map((post) => {
            const isExpired = new Date(post.expires_at).getTime() <= now;
            return (
              <li
                key={post.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {post.birth_year} ·{" "}
                    {(post.positions ?? []).join(", ") || "Any position"}
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
                <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                  {post.description}
                </p>
                <div className="mt-3 flex gap-2">
                  {!isExpired ? (
                    <ActionButton
                      action={expireRosterPost.bind(null, post.id)}
                      label="End early"
                      pendingLabel="Ending..."
                      successMessage="Post ended"
                      variant="secondary"
                      size="sm"
                    />
                  ) : null}
                  <ActionButton
                    action={deleteRosterPost.bind(null, post.id)}
                    label="Delete"
                    pendingLabel="Deleting..."
                    successMessage="Roster post deleted"
                    confirmMessage="Delete this roster post? This can't be undone."
                    variant="secondary"
                    size="sm"
                    className="!text-red-600 hover:!border-red-300"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-6 text-center">
          <p className="text-sm font-medium text-gray-900">
            No roster posts yet
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Post an open spot and families with players in that age group
            will be able to find it.
          </p>
          <Link
            href="/roster-posts/new"
            className="mt-4 inline-block rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            New post
          </Link>
        </div>
      )}
    </main>
  );
}
