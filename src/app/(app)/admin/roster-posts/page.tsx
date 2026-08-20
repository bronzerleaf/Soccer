import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { ActionButton } from "@/components/ui/action-button";
import { removeRosterPostAsAdmin } from "./actions";

export default async function AdminRosterPostsPage() {
  const { supabase } = await requireAdmin();

  const { data: posts } = await supabase
    .from("roster_posts")
    .select(
      "id, birth_year, positions, description, expires_at, coach:profiles!roster_posts_coach_id_fkey(full_name, email), club:clubs(name, city)"
    )
    .order("created_at", { ascending: false });

  // eslint-disable-next-line react-hooks/purity -- Server Component, computed fresh per request
  const now = Date.now();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/admin" className="text-sm text-slate-500 underline">
        ← Admin
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-slate-900">
        Roster posts
      </h1>

      {posts && posts.length > 0 ? (
        <ul className="mt-8 space-y-4">
          {posts.map((post) => {
            const coach = post.coach as unknown as {
              full_name: string;
              email: string;
            } | null;
            const club = post.club as unknown as {
              name: string;
              city: string;
            } | null;
            const isExpired = new Date(post.expires_at).getTime() <= now;

            return (
              <li
                key={post.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-900">
                    {club?.name} — {club?.city}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      isExpired
                        ? "bg-slate-100 text-slate-600"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {isExpired ? "Expired" : "Active"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {post.birth_year} ·{" "}
                  {(post.positions ?? []).join(", ") || "Any position"} ·
                  posted by {coach?.full_name} ({coach?.email})
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  {post.description}
                </p>
                <div className="mt-3">
                  <ActionButton
                    action={removeRosterPostAsAdmin.bind(null, post.id)}
                    label="Remove"
                    pendingLabel="Removing..."
                    successMessage="Roster post removed"
                    confirmMessage="Remove this roster post?"
                    variant="danger"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-slate-600">No roster posts yet.</p>
      )}
    </main>
  );
}
