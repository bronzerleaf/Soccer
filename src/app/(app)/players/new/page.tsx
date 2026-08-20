import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewPlayerForm } from "./new-player-form";

export default async function NewPlayerPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const [{ data: clubs }, { data: teams }] = await Promise.all([
    supabase.from("clubs").select("id, name, city").order("name"),
    supabase
      .from("teams")
      .select("id, name")
      .is("merged_into_team_id", null)
      .order("name"),
  ]);

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-xl font-semibold text-gray-900">
        Add a player profile
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        This profile stays private until you verify parental consent — it
        won&rsquo;t be visible to any coach until then.
      </p>

      <div className="mt-8">
        <NewPlayerForm clubs={clubs ?? []} teams={teams ?? []} />
      </div>
    </main>
  );
}
