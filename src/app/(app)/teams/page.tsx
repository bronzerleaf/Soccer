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

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
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
    const { q } = await searchParams;
    return renderParentTeamBrowse(supabase, userData.user.id, q?.trim() ?? "");
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
      <Link href="/dashboard" className="text-sm text-slate-500 underline">
        ← Back to dashboard
      </Link>

      <h1 className="mt-3 text-xl font-semibold text-slate-900">Teams</h1>
      <p className="mt-2 text-sm text-slate-600">
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
                className="rounded-lg border border-slate-200 p-4"
              >
                <p className="text-sm font-medium text-slate-900">
                  {team.name}
                </p>
                {city ? (
                  <p className="text-xs text-slate-500">{city.name}</p>
                ) : null}

                {status === "approved" ? (
                  <Link
                    href={`/teams/${team.id}/manage`}
                    className="mt-2 inline-block text-sm font-medium text-slate-700 underline"
                  >
                    Manage this team
                  </Link>
                ) : status === "pending" ? (
                  <p className="mt-2 text-sm text-slate-500">
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
        <p className="mt-8 text-sm text-slate-600">
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
  searchQuery: string
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

  const teamList = (teams ?? [])
    .filter((team) => {
      if (searchQuery && !team.name.toLowerCase().includes(searchQuery.toLowerCase())) {
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
      <Link href="/dashboard" className="text-sm text-slate-500 underline">
        ← Back to dashboard
      </Link>

      <h1 className="mt-3 text-xl font-semibold text-slate-900">Teams</h1>
      <p className="mt-2 text-sm text-slate-600">
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
        <input
          id="q"
          type="search"
          name="q"
          defaultValue={searchQuery}
          placeholder="Search teams by name"
          className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
        />
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
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {team.name}
                        </p>
                        {coach ? <Badge tone="verified">Verified team</Badge> : null}
                      </div>
                      {city ? (
                        <p className="text-xs text-slate-500">{city.name}</p>
                      ) : null}
                      {team.leagues && team.leagues.length > 0 ? (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {team.leagues.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {coach ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-slate-700 underline">
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
                          className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
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
                    <p className="mt-2 text-xs text-slate-400">
                      No verified coach yet.
                    </p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-slate-600">
          No teams yet — they show up here once a parent adds one to
          their player&rsquo;s profile.
        </p>
      )}
    </main>
  );
}
