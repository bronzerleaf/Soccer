import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PlayersPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: players } = await supabase
    .from("players")
    .select("id, first_name, last_initial, birth_year, city, open_to_opportunities, consent_completed")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-lg px-4 pb-32 pt-8 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">PitchLink</p>
          <h1 className="mt-1 text-2xl font-black text-[#0b1736]">Your players</h1>
        </div>
        <Link href="/players/new" className="rounded-xl bg-[#0b1736] px-4 py-2.5 text-xs font-black text-white">Add player</Link>
      </div>

      {players && players.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {players.map((player) => (
            <li key={player.id}>
              <Link href={`/players/${player.id}`} className="pitch-card flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-sm font-black text-[#0b1736]">{player.first_name} {player.last_initial}. · {player.birth_year}</p>
                  <p className="mt-1 text-xs text-slate-500">{player.city}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${!player.consent_completed ? "bg-amber-50 text-amber-800" : player.open_to_opportunities ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {!player.consent_completed ? "Consent needed" : player.open_to_opportunities ? "Searchable" : "Private"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="pitch-card mt-6 p-7 text-center">
          <div className="text-3xl">⚽</div>
          <p className="mt-3 text-sm font-black text-[#0b1736]">Add your first player</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">Create an editable soccer profile, add clips, and privately choose whether verified professionals can find it.</p>
          <Link href="/players/new" className="mt-4 inline-block rounded-xl bg-[#0b1736] px-4 py-2.5 text-sm font-bold text-white">Add a player</Link>
        </div>
      )}
    </main>
  );
}
