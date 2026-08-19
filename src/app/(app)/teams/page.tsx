import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClaimTeamForm } from "./claim-team-form";
import { LocationSettings } from "@/app/(app)/feed/location-settings";
import { haversineMiles } from "@/lib/geo";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  const { q } = await searchParams;
  const searchQuery = q?.trim() ?? "";

  if (profile?.role === "parent") {
    return renderTeamDirectory(supabase, userData.user.id, searchQuery);
  }

  if (profile?.role !== "coach") redirect("/dashboard");
  return renderCoachTeams(supabase, userData.user.id, searchQuery);
}

async function renderTeamDirectory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  searchQuery: string
) {
  const [{ data: teams }, { data: cities }, { data: profile }, { data: myPlayers }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, leagues, city_id, city:cities(name)")
      .is("merged_into_team_id", null)
      .order("name"),
    supabase.from("cities").select("id, name, latitude, longitude").order("name"),
    supabase.from("profiles").select("home_city_id, radius_miles").eq("id", userId).single(),
    supabase.from("players").select("id, team_id, team_membership_verified").eq("parent_id", userId),
  ]);

  const cityList = cities ?? [];
  const cityById = new Map(cityList.map((c) => [c.id, c]));
  const homeCity = profile?.home_city_id ? cityById.get(profile.home_city_id) : null;
  const radiusMiles = profile?.radius_miles ?? null;
  const canFilterByRadius = !!(homeCity && radiusMiles);
  const verifiedTeamIds = new Set(
    (myPlayers ?? [])
      .filter((p) => p.team_membership_verified && p.team_id)
      .map((p) => p.team_id as string)
  );

  const normalizedQuery = searchQuery.toLowerCase();
  const teamList = (teams ?? []).filter((team) => {
    const city = team.city as unknown as { name: string } | null;
    const haystack = `${team.name} ${city?.name ?? ""} ${(team.leagues ?? []).join(" ")}`.toLowerCase();
    if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;
    if (!canFilterByRadius) return true;
    const teamCity = team.city_id ? cityById.get(team.city_id) : null;
    if (!teamCity || !homeCity) return true;
    return haversineMiles(homeCity.latitude, homeCity.longitude, teamCity.latitude, teamCity.longitude) <= radiusMiles;
  });

  return (
    <main className="mx-auto max-w-2xl px-4 pb-32 pt-7 sm:px-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">PitchLink teams</p>
        <h1 className="pitch-gradient-text mt-1 text-3xl font-black tracking-tight">Find your soccer community</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Search verified team pages, connect your player to the right team, and see verified teammates once membership is confirmed.</p>
      </header>

      <form method="get" className="pitch-card mt-6 flex items-center gap-3 p-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-slate-400" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
        <input name="q" type="search" defaultValue={searchQuery} placeholder="Search team, city, or league..." className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
        <button className="rounded-xl bg-[#0b1736] px-4 py-2 text-xs font-black text-white">Search</button>
      </form>

      <div className="mt-4">
        <LocationSettings cities={cityList.map((c) => ({ id: c.id, name: c.name }))} homeCityId={profile?.home_city_id ?? null} radiusMiles={radiusMiles} />
      </div>

      <div className="mt-7 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-black text-[#0b1736]">Teams</h2>
          <p className="text-xs text-slate-500">Team pages never expose unverified player membership.</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{teamList.length} found</span>
      </div>

      {teamList.length ? (
        <ul className="mt-4 space-y-3">
          {teamList.map((team) => {
            const city = team.city as unknown as { name: string } | null;
            const connected = verifiedTeamIds.has(team.id);
            return (
              <li key={team.id}>
                <Link href={`/teams/${team.id}`} className="pitch-card group flex items-center gap-4 p-4 transition-transform active:scale-[0.99]">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#0b1736,#12345a)] text-xl font-black text-white shadow-sm">{team.name.slice(0, 2).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-black text-[#0b1736]">{team.name}</h3>
                      {connected ? <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">✓ Your team</span> : null}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{city?.name ?? "Location not listed"}</p>
                    {team.leagues?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{team.leagues.slice(0, 3).map((league) => <span key={league} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{league}</span>)}</div> : null}
                  </div>
                  <span className="text-slate-300 transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="pitch-card mt-4 p-8 text-center"><div className="text-3xl">⚽</div><h3 className="mt-3 font-black text-[#0b1736]">No teams match yet</h3><p className="mt-1 text-sm text-slate-500">Try another club name, city, or league.</p></div>
      )}
    </main>
  );
}

async function renderCoachTeams(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  searchQuery: string
) {
  const [{ data: teams }, { data: myVerifications }] = await Promise.all([
    supabase.from("teams").select("id, name, leagues, city:cities(name)").is("merged_into_team_id", null).order("name"),
    supabase.from("team_verifications").select("team_id, status").eq("coach_id", userId),
  ]);
  const statusByTeam = new Map((myVerifications ?? []).map((v) => [v.team_id as string, v.status as string]));
  const q = searchQuery.toLowerCase();
  const filtered = (teams ?? []).filter((team) => {
    const city = team.city as unknown as { name: string } | null;
    return !q || `${team.name} ${city?.name ?? ""} ${(team.leagues ?? []).join(" ")}`.toLowerCase().includes(q);
  });

  return (
    <main className="mx-auto max-w-2xl px-4 pb-32 pt-7 sm:px-6">
      <header><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Coach workspace</p><h1 className="pitch-gradient-text mt-1 text-3xl font-black tracking-tight">Teams</h1><p className="mt-2 text-sm text-slate-500">Find your team, claim it, then verify the players who actually belong on your roster.</p></header>
      <form method="get" className="pitch-card mt-6 flex gap-2 p-3"><input name="q" defaultValue={searchQuery} placeholder="Search teams..." className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"/><button className="rounded-xl bg-[#0b1736] px-4 py-2 text-xs font-black text-white">Search</button></form>
      <ul className="mt-5 space-y-3">
        {filtered.map((team) => {
          const status = statusByTeam.get(team.id);
          const city = team.city as unknown as { name: string } | null;
          return (
            <li key={team.id} className="pitch-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0b1736] text-sm font-black text-white">{team.name.slice(0,2).toUpperCase()}</div>
                <div className="min-w-0 flex-1"><h2 className="font-black text-[#0b1736]">{team.name}</h2><p className="mt-0.5 text-xs text-slate-500">{city?.name ?? "Location not listed"}{team.leagues?.length ? ` · ${team.leagues.join(" · ")}` : ""}</p></div>
                {status ? <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${status === "approved" ? "bg-emerald-50 text-emerald-700" : status === "pending" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{status}</span> : null}
              </div>
              {status === "approved" ? <Link href={`/teams/${team.id}/manage`} className="mt-4 block rounded-xl bg-emerald-600 px-4 py-2.5 text-center text-sm font-black text-white">Manage verified roster</Link> : status === "pending" ? <p className="mt-4 text-xs text-slate-500">Your ownership claim is under review.</p> : <div className="mt-4"><ClaimTeamForm teamId={team.id}/></div>}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
