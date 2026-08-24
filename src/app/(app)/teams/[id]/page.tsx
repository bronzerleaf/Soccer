import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startConversationWithTeamCoach } from "@/app/(app)/messages/actions";
import { Badge, VerifiedMark } from "@/components/ui/badge";
import { ClubCrest } from "@/components/ui/club-crest";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { AppHeader } from "@/components/pitchlink/app-header";
import { SectionHeader } from "@/components/pitchlink/section-header";

export default async function TeamProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, leagues, gotsport_url, city:cities(name)")
    .eq("id", id)
    .is("merged_into_team_id", null)
    .single();

  if (!team) {
    notFound();
  }

  const city = team.city as unknown as { name: string } | null;

  // Empty for anyone who isn't a verified team owner -- "teams:
  // verified owner updates own team" is the only write policy, but a
  // read of the team row itself is already open to any authenticated
  // user ("teams: any authenticated user reads"), same as clubs.
  const [{ data: coachRows }, { data: rosterRows }] = await Promise.all([
    supabase.rpc("get_team_coach", { target_team_id: id }),
    supabase.rpc("get_team_roster", { target_team_id: id }),
  ]);
  const coach = coachRows?.[0] as { coach_id: string; full_name: string } | undefined;
  type Teammate = { id: string; first_name: string; last_initial: string; birth_year: number; positions: string[] };
  const roster = (rosterRows ?? []) as Teammate[];

  return (
    <main className="mx-auto max-w-lg px-6 py-12 pb-24">
      <AppHeader title={team.name} backHref="/teams" backLabel="All teams" />

      <div className="mt-4 flex items-center gap-3.5">
        <ClubCrest name={team.name} size={64} />
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-extrabold text-gray-900">{team.name}</h1>
            {coach ? <VerifiedMark /> : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {city?.name ? <span className="text-xs text-gray-500">{city.name}</span> : null}
            {(team.leagues ?? []).map((league: string) => (
              <Badge key={league} tone="neutral">
                {league}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {team.gotsport_url ? (
        <a
          href={team.gotsport_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-400"
        >
          GotSport team page ↗
        </a>
      ) : null}

      <div className="mt-6 rounded-[18px] border border-gray-200 bg-white p-4 shadow-[0_3px_16px_rgba(17,24,39,0.07)]">
        {coach ? (
          <>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-gray-900">{coach.full_name}</p>
              <Badge tone="verified">
                <VerifiedMark className="h-3.5 w-3.5" />
                Verified coach
              </Badge>
            </div>
            <form
              action={startConversationWithTeamCoach.bind(null, team.id)}
              className="mt-3 flex gap-2"
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
          </>
        ) : (
          <p className="text-sm text-gray-600">
            No verified coach yet — this team hasn&rsquo;t been claimed.
          </p>
        )}
      </div>

      {roster.length > 0 ? (
        <div className="mt-6">
          <SectionHeader title="Verified Teammates" subtitle={`Other verified players on ${team.name}.`} />
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {roster.map((mate) => (
              <div
                key={mate.id}
                className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white p-2.5"
              >
                <PlayerAvatar name={mate.first_name} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-xs font-semibold text-gray-900">
                      {mate.first_name} {mate.last_initial}.
                    </p>
                    <VerifiedMark className="h-3.5 w-3.5" />
                  </div>
                  <p className="truncate text-[11px] text-gray-400">
                    {(mate.positions ?? []).join(", ") || "No position"} · {mate.birth_year}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-6 text-xs text-gray-400">
          Teammates show up here once your own player is a verified member of this team.
        </p>
      )}

      <p className="mt-6 text-center text-xs text-gray-400">
        <Link href="/teams" className="underline">
          Browse all teams
        </Link>
      </p>
    </main>
  );
}
