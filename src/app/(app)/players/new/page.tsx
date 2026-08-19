import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewPlayerForm } from "./new-player-form";

export default async function NewPlayerPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, name, city")
    .order("name");

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-xl font-semibold text-slate-900">
        Add a player profile
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        This profile stays private until you verify parental consent — it
        won&rsquo;t be visible to any coach until then.
      </p>

      <div className="mt-8">
        <NewPlayerForm clubs={clubs ?? []} />
      </div>
    </main>
  );
}
