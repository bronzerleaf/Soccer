import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClaimTeamForm } from "./claim-team-form";
import { startConversationWithTeamCoach } from "@/app/(app)/messages/actions";
import { LocationSettings } from "@/app/(app)/feed/location-settings";
import { haversineMiles } from "@/lib/geo";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ClubCrest } from "@/components/ui/club-crest";
import { BackLink } from "@/components/pitchlink/back-link";
import { FilterChip } from "@/components/pitchlink/filter-chip";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; league?: string }>;
}) {
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

  if (profile?.role === "parent") {
    const { q, league } = await searchParams;
    return renderParentTeamBrowse(
      supabase,
      userData.user.id,
      q?.trim() ?? "",
      league?.trim() ?? ""
    );
  }

  // Team claiming is separate from club verification -- a coach doesn't
  // need an approved club affiliation to claim a team, since not every
  // team's coach will already be on this app as a club-verified user.
  if (profile?.role !== "coach") {
    redirect("/dashboard");
  }

  const [{ data: teams }, { data: myVerifications }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, city:cities(name)")
      .is("merged_into_team_id", null)
      .order("name"),
    supabase
      .from("team_verifications")
      .select("team_id, status")
      .eq("coach_id", userData.user.id),
  ]);

  const statusByTeam = new Map(
    (myVerifications ?? []).map((v) => [v.team_id as string, v.status as string])
  );

  return (
    <main className="mx-auto max-w-lg px-6 py-12 pb-24">
      <BackLink href="/dashboard" label="Back to dashboard" />

      <h1 className="mt-3 text-xl font-semibold text-gray-900">Teams</h1>
      <p className="mt-2 text-sm text-gray-600">
        Claim the team you coach to manage its profile and see its roster.
        An admin reviews every claim before it&rsquo;s approved. Teams show
        up here once a parent adds one to their player&rsquo;s profile.
      </p>

      {teams && teams.length > 0 ? (
        <ul className="mt-8 space-y-3">
          {teams.map((team) => {
            const status = statusByTeam.get(team.id);
            const city = team.city as unknown as { name: string } | null;

            return (
              <li
                key={team.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <Link
                  href={`/teams/${team.id}`}
                  className="text-sm font-medium text-gray-900 underline"
                >
                  {team.name}
                </Link>
                {city ? (
                  <p className="text-xs text-gray-500">{city.name}</p>
                ) : null}

                {status === "approved" ? (
                  <Link
                    href={`/teams/${team.id}/manage`}
                    className="mt-2 inline-block text-sm font-medium text-gray-700 underline"
                  >
                    Manage this team
                  </Link>
                ) : status === "pending" ? (
                  <p className="mt-2 text-sm text-gray-500">
                    Your claim is under review.
                  </p>
                ) : (
                  <div className="mt-3">
                    {status === "rejected" ? (
                      <p className="mb-2 text-xs text-amber-800">
                        Your last claim wasn&rsquo;t approved. You can try
                        again with more detail.
                      </p>
                    ) : null}
                    <ClaimTeamForm teamId={team.id} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-gray-600">
          No teams yet — once a parent adds one to their player&rsquo;s
          profile, it&rsquo;ll show up here for you to claim.
        </p>
      )}
    </main>
  );
}

// A parent can browse the team list and message a team's verified coach
// directly — the same "message the club" shape a roster post already
// offers, just discovered by team name. Deliberately does not show a
// roster, a player count, or anything about who's on a team: that stays
// gated on the caller's own verified membership via get_team_roster(),
// completely untouched by this. Team name/city/leagues are the same
// non-sensitive org metadata clubs already expose to everyone.
//
// Location filtering reuses the exact same profile-level home_city_id/
// radius_miles + haversine pattern the local feed already established —
// one shared "my area" preference, no new dependency, no raw device
// location or zip-code geocoding involved.
async function renderParentTeamBrowse(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  searchQuery: string,
  leagueQuery: string
) {
  const [{ data: teams }, { data: cities }, { data: profile }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, leagues, city_id, city:cities(name)")
      .is("merged_into_team_id", null)
      .order("name"),
    supabase.from("cities").select("id, name, latitude, longitude").order("name"),
    supabase
      .from("profiles")
      .select("home_city_id, radius_miles")
      .eq("id", userId)
      .single(),
  ]);

  const cityList = cities ?? [];
  const cityById = new Map(cityList.map((c) => [c.id, c]));
  const homeCity = profile?.home_city_id ? cityById.get(profile.home_city_id) : null;
  const radiusMiles = profile?.radius_miles ?? null;
  const canFilterByRadius = !!(homeCity && radiusMiles);

  const allLeagues = Array.from(
    new Set((teams ?? []).flatMap((team) => team.leagues ?? []))
  ).sort();

  const teamList = (teams ?? [])
    .filter((team) => {
      if (searchQuery && !team.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (leagueQuery && !(team.leagues ?? []).includes(leagueQuery)) {
        return false;
      }
      if (!canFilterByRadius) return true;
      // A team with no city set is never excluded by a radius filter —
      // there's nothing to measure, so it stays visible rather than
      // silently disappearing.
      const teamCity = team.city_id ? cityById.get(team.city_id) : null;
      if (!teamCity || !homeCity) return true;
      return (
        haversineMiles(
          homeCity.latitude,
          homeCity.longitude,
          teamCity.latitude,
          teamCity.longitude
        ) <= radiusMiles
      );
    });

  const coachContacts = await Promise.all(
    teamList.map((team) =>
      supabase.rpc("get_team_coach", { target_team_id: team.id })
    )
  );

  return (
    <main className="mx-auto max-w-lg px-6 py-12 pb-24">
      <BackLink href="/dashboard" label="Back to dashboard" />

      <h1 className="mt-3 text-xl font-semibold text-gray-900">Teams</h1>
      <p className="mt-2 text-sm text-gray-600">
        Browse teams on OpenRoster and message a verified coach directly.
        This shows team names and leagues only — never who&rsquo;s on a
        roster, which stays private to that team&rsquo;s own families.
      </p>

      <div className="mt-6">
        <LocationSettings
          cities={cityList.map((c) => ({ id: c.id, name: c.name }))}
          homeCityId={profile?.home_city_id ?? null}
          radiusMiles={radiusMiles}
        />
      </div>

      <form method="get" className="mt-4">
        <label htmlFor="q" className="sr-only">
          Search teams
        </label>
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4.3-4.3" />
          </svg>
          <input
            id="q"
            type="search"
            name="q"
            defaultValue={searchQuery}
            placeholder="Search teams by name"
            className="w-full rounded-full border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
          />
        </div>

        {allLeagues.length > 0 ? (
          <div className="mt-3 flex items-center gap-3">
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400 [&::-webkit-details-marker]:hidden">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 6h16M7 12h10M10 18h4" />
                </svg>
                Filters
                {leagueQuery ? (
                  <span className="rounded-full bg-gray-900 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                    1
                  </span>
                ) : null}
              </summary>

              <div className="absolute z-10 mt-2 w-[min(90vw,20rem)] space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                <div>
                  <label
                    htmlFor="league"
                    className="block text-sm font-medium text-gray-900"
                  >
                    League
                  </label>
                  <select
                    id="league"
                    name="league"
                    defaultValue={leagueQuery}
                    className="mt-1.5 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
                  >
                    <option value="">Any</option>
                    {allLeagues.map((league) => (
                      <option key={league} value={league}>
                        {league}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Apply filters
                </button>
              </div>
            </details>

            {leagueQuery ? (
              <Link
                href={searchQuery ? `/teams?q=${encodeURIComponent(searchQuery)}` : "/teams"}
                className="text-xs font-medium text-gray-500 underline"
              >
                Clear
              </Link>
            ) : null}
          </div>
        ) : null}

        {leagueQuery ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <FilterChip href={searchQuery ? `/teams?q=${encodeURIComponent(searchQuery)}` : "/teams"}>
              {leagueQuery}
            </FilterChip>
          </div>
        ) : null}
      </form>

      {teamList.length > 0 ? (
        <ul className="mt-8 space-y-3">
          {teamList.map((team, i) => {
            const city = team.city as unknown as { name: string } | null;
            const coach = coachContacts[i].data?.[0] as
              | { coach_id: string; full_name: string }
              | undefined;

            return (
              <li key={team.id}>
                <Card>
                  <div className="flex items-center gap-3">
                    <ClubCrest name={team.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/teams/${team.id}`}
                          className="truncate text-sm font-semibold text-gray-900 underline"
                        >
                          {team.name}
                        </Link>
                        {coach ? <Badge tone="verified">Verified team</Badge> : null}
                      </div>
                      {city ? (
                        <p className="text-xs text-gray-500">{city.name}</p>
                      ) : null}
                      {team.leagues && team.leagues.length > 0 ? (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {team.leagues.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {coach ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700 underline">
                        Message {coach.full_name}
                      </summary>
                      <form
                        action={startConversationWithTeamCoach.bind(
                          null,
                          team.id
                        )}
                        className="mt-2 flex gap-2"
                      >
                        <textarea
                          name="body"
                          rows={2}
                          required
                          placeholder={`Introduce yourself to ${coach.full_name}...`}
                          className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="shrink-0 self-start rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                        >
                          Send
                        </button>
                      </form>
                    </details>
                  ) : (
                    <p className="mt-2 text-xs text-gray-400">
                      No verified coach yet.
                    </p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-gray-600">
          No teams yet — they show up here once a parent adds one to
          their player&rsquo;s profile.
        </p>
      )}
    </main>
  );
}
