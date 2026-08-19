import Link from "next/link";
import { requireVerifiedCoach } from "@/lib/coach";
import { LEVELS_OF_PLAY, POSITIONS, levelLabel } from "@/app/(app)/players/constants";

const currentYear = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: 16 }, (_, i) => currentYear - 19 + i);

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase } = await requireVerifiedCoach();
  const params = await searchParams;

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const birthYear = typeof params.birth_year === "string" ? params.birth_year : "";
  const positions = toArray(params.positions);
  const city = typeof params.city === "string" ? params.city.trim() : "";
  const level = typeof params.level_of_play === "string" ? params.level_of_play : "";

  let query = supabase
    .from("players")
    .select(
      "id, first_name, last_initial, birth_year, positions, preferred_foot, city, photo_url, years_experience, level_of_play, team_membership_verified, current_club:clubs(name, city), team:teams(id, name, leagues)"
    )
    .order("created_at", { ascending: false });

  if (q) {
    const safe = q.replace(/[%_]/g, "");
    query = query.or(`first_name.ilike.%${safe}%,city.ilike.%${safe}%`);
  }
  if (birthYear) query = query.eq("birth_year", Number(birthYear));
  if (positions.length > 0) query = query.overlaps("positions", positions);
  if (city) query = query.ilike("city", `%${city.replace(/[%_]/g, "")}%`);
  if (level) query = query.eq("level_of_play", level);

  const { data: players } = await query;

  const photoPaths = (players ?? []).map((p) => p.photo_url).filter((p): p is string => Boolean(p));
  let signedUrlByPath = new Map<string, string>();
  if (photoPaths.length > 0) {
    const { data: signed } = await supabase.storage.from("player-photos").createSignedUrls(photoPaths, 3600);
    signedUrlByPath = new Map(
      (signed ?? [])
        .filter((s): s is typeof s & { signedUrl: string } => Boolean(s.signedUrl))
        .map((s) => [s.path ?? "", s.signedUrl])
    );
  }

  const filtersActive = Boolean(birthYear || positions.length || city || level);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-32 pt-7 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">PitchLink</p>
          <h1 className="pitch-gradient-text mt-1 text-3xl font-black tracking-tight">Discover players</h1>
          <p className="mt-1 max-w-lg text-sm text-slate-500">
            Search profiles whose families have privately enabled professional discovery.
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-xl shadow-sm">⚽</div>
      </header>

      <form method="get" className="space-y-4">
        <div className="pitch-card flex items-center gap-3 p-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-slate-400" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
          </svg>
          <input name="q" type="search" defaultValue={q} placeholder="Search player name or city..." className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
          <button type="submit" className="rounded-xl bg-[#0b1736] px-4 py-2 text-xs font-bold text-white">Search</button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 text-sm font-semibold">
          <span className="shrink-0 rounded-full bg-[#0b1736] px-4 py-2 text-white">Players</span>
          <Link href="/roster-posts" className="pitch-pill shrink-0 px-4 py-2 text-slate-600">Opportunities</Link>
          <Link href="/teams" className="pitch-pill shrink-0 px-4 py-2 text-slate-600">Teams</Link>
        </div>

        <details className="pitch-card overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-bold text-slate-800">
            <span>Filters</span>
            <span className="text-xs font-medium text-emerald-600">{filtersActive ? "Active" : "Age · position · level · city"}</span>
          </summary>
          <div className="grid gap-4 border-t border-slate-100 p-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-700">
              Birth year
              <select name="birth_year" defaultValue={birthYear} className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-400">
                <option value="">Any birth year</option>
                {BIRTH_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700">
              Level of play
              <select name="level_of_play" defaultValue={level} className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-400">
                <option value="">Any level</option>
                {LEVELS_OF_PLAY.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700 sm:col-span-2">
              City
              <input name="city" defaultValue={city} placeholder="e.g. Frisco" className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-400" />
            </label>
            <div className="sm:col-span-2">
              <span className="text-xs font-bold text-slate-700">Position</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {POSITIONS.map((position) => (
                  <label key={position} className="cursor-pointer">
                    <input type="checkbox" name="positions" value={position} defaultChecked={positions.includes(position)} className="peer sr-only" />
                    <span className="block rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700">{position}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white">Apply filters</button>
              <Link href="/search" className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600">Clear</Link>
            </div>
          </div>
        </details>
      </form>

      <div className="mt-7 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-black text-[#0b1736]">Players</h2>
          <p className="text-xs text-slate-500">Only approved soccer professionals can access this search.</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{(players ?? []).length} found</span>
      </div>

      {players && players.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {players.map((player) => {
            const club = player.current_club as unknown as { name: string; city: string } | null;
            const team = player.team as unknown as { id: string; name: string; leagues: string[] } | null;
            const photoUrl = player.photo_url ? signedUrlByPath.get(player.photo_url) : null;
            const playerLevel = levelLabel(player.level_of_play);

            return (
              <li key={player.id}>
                <Link href={`/search/${player.id}`} className="pitch-card group flex gap-4 p-4 transition-transform active:scale-[0.99]">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100 to-slate-100">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-black text-emerald-700">{player.first_name.slice(0, 1)}</div>
                    )}
                    {player.team_membership_verified ? <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-[11px] font-black text-white">✓</span> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="truncate text-base font-black text-[#0b1736]">{player.first_name} {player.last_initial}.</h3>
                        {player.team_membership_verified ? (
                          <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">Verified team player</span>
                        ) : null}
                      </div>
                      <span className="text-slate-300 transition-transform group-hover:translate-x-0.5">→</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-700">{(player.positions ?? []).join(" · ") || "Position not set"} · {player.birth_year}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{team?.name ?? club?.name ?? "Club/team not listed"} · {player.city}</p>
                    <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">
                      {[playerLevel, player.years_experience !== null ? `${player.years_experience} yrs playing` : null, team?.leagues?.length ? team.leagues.join(" · ") : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="pitch-card mt-4 p-8 text-center">
          <div className="text-3xl">⚽</div>
          <h3 className="mt-3 font-black text-[#0b1736]">No matching players yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Try widening the filters. Families control whether a profile can appear here.</p>
        </div>
      )}
    </main>
  );
}
