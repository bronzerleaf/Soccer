import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
      "id, birth_year, positions, tryout_date, description, expires_at, club:clubs(name, city)"
    )
    .eq("id", id)
    .single();

  if (!post) {
    notFound();
  }

  const club = post.club as unknown as { name: string; city: string } | null;

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link href="/roster-posts" className="text-sm text-slate-500 underline">
        ← Back to open roster spots
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
        </p>
      ) : null}

      <p className="mt-4 text-sm leading-6 text-slate-700">
        {post.description}
      </p>
    </main>
  );
}
