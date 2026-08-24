import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/pitchlink/back-link";
import { HighlightComposerForm } from "./highlight-composer-form";

export default async function PostHighlightPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  if (profile?.role !== "parent") {
    redirect("/post");
  }

  const [{ data: players }, { data: cities }] = await Promise.all([
    supabase
      .from("players")
      .select("id, first_name, last_initial, birth_year")
      .eq("parent_id", userData.user.id)
      .eq("consent_completed", true)
      .order("first_name"),
    supabase.from("cities").select("id, name").order("name"),
  ]);

  return (
    <main className="mx-auto max-w-sm px-6 py-12">
      <BackLink href="/post" label="Back to post options" />
      <h1 className="mt-3 text-xl font-semibold text-gray-900">Add a highlight clip</h1>

      {!players || players.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-4 text-center">
          <p className="text-sm text-gray-600">
            You don&rsquo;t have any consent-verified players yet.
          </p>
          <Link
            href="/players"
            className="mt-3 inline-block rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Go to your players
          </Link>
        </div>
      ) : (
        <div className="mt-6">
          <HighlightComposerForm players={players} cities={cities ?? []} />
        </div>
      )}
    </main>
  );
}
