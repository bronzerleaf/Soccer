import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startConversationWithTeamCoach } from "@/app/(app)/messages/actions";

export default async function TeamProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const [{ data: team }, { data: coachRows }, { data: rosterRows }, { data: myPlayers }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, leagues, gotsport_team_id, gotsport_url, city:cities(name)")
      .eq("id", id)
      .is("merged_into_team_id", null)
      .single(),
    supabase.rpc("get_team_coach", { target_team_id: id }),
    supabase.rpc("get_team_roster", { target_team_id: id }),
    supabase
      .from("players")
      .select("id, first_name, team_id, team_membership_verified")
      .eq("parent_id", userData.user.id)
      .eq("team_id", id),
  ]);

  if (!team) notFound();

  const city = team.city as unknown as { name: string } | null;
  const coach = coachRows?.[0] as { coach_id: string; full_name: string } | undefined;
  const roster = (rosterRows ?? []) as Array<{
    id: string;
    first_name: string;
    last_initial: string;
    birth_year: number;
    positions: string[];
  }>;
  const verifiedMine = (myPlayers ?? []).find((player) => player.team_membership_verified);
  const pendingMine = (myPlayers ?? []).find((player) => !player.team_membership_verified);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-32 pt-5 sm:px-6">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/teams" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold text-[#0b1736] shadow-sm" aria-label="Back to teams">←</Link>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">Team profile</span>
        <div className="h-10 w-10" />
      </div>

      <section className="pitch-card overflow-hidden">
        <div className="h-28 bg-[linear-gradient(120deg,#0b1736_0%,#153c61_55%,#08a66c_150%)]" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end justify-between gap-3">
            <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border-4 border-white bg-[#0b1736] text-2xl font-black text-white shadow-md">
              {team.name.slice(0, 2).toUpperCase()}
            </div>
            {verifiedMine ? <span className="mb-1 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700">✓ Verified team connection</span> : null}
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-[#0b1736]">{team.name}</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">{city?.name ?? "Location not listed"}</p>
          {team.leagues?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {team.leagues.map((league) => <span key={league} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{league}</span>)}
            </div>
          ) : null}
        </div>
      </section>

      {team.gotsport_team_id || team.gotsport_url ? (
        <section className="pitch-card mt-4 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-[#0b1736]">GotSport reference</p>
              {team.gotsport_team_id ? <p className="mt-1 text-xs text-slate-500">Team ID: {team.gotsport_team_id}</p> : null}
            </div>
            {team.gotsport_url ? (
              <a href={team.gotsport_url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">Official page ↗</a>
            ) : null}
          </div>
        </section>
      ) : null}

      {pendingMine ? (
        <section className="mt-4 rounded-[20px] border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-black text-amber-900">Team membership pending verification</p>
          <p className="mt-1 text-xs leading-5 text-amber-800">{pendingMine.first_name}&rsquo;s connection to this team is waiting for a verified team coach. The team roster stays hidden until that happens.</p>
        </section>
      ) : null}

      <section className="pitch-card mt-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-[#0b1736]">Team contact</h2>
            <p className="mt-1 text-xs text-slate-500">Verified adult soccer contact on PitchLink.</p>
          </div>
          {coach ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">✓ Verified coach</span> : null}
        </div>
        {coach ? (
          <div className="mt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0b1736] text-sm font-black text-white">{coach.full_name.slice(0, 1)}</div>
              <div><p className="text-sm font-black text-slate-900">{coach.full_name}</p><p className="text-xs text-slate-500">Verified team coach</p></div>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer list-none rounded-xl bg-[#0b1736] px-4 py-3 text-center text-sm font-black text-white">Message team coach</summary>
              <form action={startConversationWithTeamCoach.bind(null, team.id)} className="mt-3">
                <textarea name="body" rows={3} required placeholder={`Introduce your family to ${coach.full_name}...`} className="block w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:bg-white" />
                <button type="submit" className="mt-2 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white">Send message</button>
              </form>
            </details>
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">This team does not have a verified coach on PitchLink yet.</p>
        )}
      </section>

      <section className="pitch-card mt-4 p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-[#0b1736]">Verified players</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Only families with their own verified player on this team can see the verified roster.</p>
          </div>
          {verifiedMine ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">{roster.length}</span> : null}
        </div>

        {verifiedMine && roster.length ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {roster.map((player) => (
              <div key={player.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-slate-100 text-sm font-black text-emerald-800">
                  {player.first_name.slice(0, 1)}
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-[9px] text-white">✓</span>
                </div>
                <div className="min-w-0"><p className="truncate text-sm font-black text-[#0b1736]">{player.first_name} {player.last_initial}.</p><p className="truncate text-[11px] font-semibold text-slate-500">{(player.positions ?? []).join(" · ") || "Position not listed"} · {player.birth_year}</p></div>
              </div>
            ))}
          </div>
        ) : verifiedMine ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-center"><p className="text-sm font-bold text-slate-700">No other verified players yet.</p></div>
        ) : (
          <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-center"><div className="text-2xl">🔒</div><p className="mt-2 text-sm font-black text-slate-800">Roster protected</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">Your own player must be verified on this team before the roster is shown.</p></div>
        )}
      </section>
    </main>
  );
}
