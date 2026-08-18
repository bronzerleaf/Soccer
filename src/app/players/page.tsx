import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PlayersPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: players } = await supabase
    .from("players")
    .select(
      "id, first_name, last_initial, birth_year, city, open_to_opportunities, consent_completed"
    )
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">
          Your players
        </h1>
        <Link
          href="/players/new"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Add a player
        </Link>
      </div>

      {players && players.length > 0 ? (
        <ul className="mt-8 space-y-3">
          {players.map((player) => (
            <li key={player.id}>
              <Link
                href={`/players/${player.id}`}
                className="block rounded-lg border border-slate-200 p-4 hover:border-slate-300"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-900">
                    {player.first_name} {player.last_initial}. · {player.birth_year}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      !player.consent_completed
                        ? "bg-amber-100 text-amber-800"
                        : player.open_to_opportunities
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {!player.consent_completed
                      ? "Needs verification"
                      : player.open_to_opportunities
                        ? "Open to opportunities"
                        : "Not open"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{player.city}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-6 text-center">
          <p className="text-sm font-medium text-slate-900">
            Add your first player
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Create a profile, verify parental consent, then flag them open
            to opportunities whenever you&rsquo;re ready for coaches to find
            them.
          </p>
          <Link
            href="/players/new"
            className="mt-4 inline-block rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Add a player
          </Link>
        </div>
      )}
    </main>
  );
}
