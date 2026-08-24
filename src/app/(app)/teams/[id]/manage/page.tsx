import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ClubCrest } from "@/components/ui/club-crest";
import { InfoTile, InfoTileRow } from "@/components/ui/info-tile";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { TeamProfileForm } from "./team-profile-form";
import { MergeTeamForm } from "./merge-team-form";
import { removeTeamPlayer, verifyTeamPlayer, unverifyTeamPlayer } from "./actions";

export default async function ManageTeamPage({
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

  const { data: isOwner } = await supabase.rpc("is_verified_team_owner", {
    check_coach_id: userData.user.id,
    check_team_id: id,
  });

  if (!isOwner) {
    redirect("/teams");
  }

  const [{ data: team }, { data: roster }, { data: cities }, { data: otherTeams }] =
    await Promise.all([
      supabase
        .from("teams")
        .select("id, name, city_id, leagues, gotsport_url, city:cities(name)")
        .eq("id", id)
        .single(),
      supabase
        .from("players")
        .select("id, first_name, last_initial, birth_year, positions, team_membership_verified")
        .eq("team_id", id)
        .order("first_name"),
      supabase.from("cities").select("id, name").order("name"),
      supabase
        .from("teams")
        .select("id, name")
        .is("merged_into_team_id", null)
        .neq("id", id)
        .order("name"),
    ]);

  if (!team) {
    redirect("/teams");
  }

  const city = team.city as unknown as { name: string } | null;
  const roster_ = roster ?? [];
  const verifiedCount = roster_.filter((p) => p.team_membership_verified).length;
  const pendingCount = roster_.length - verifiedCount;

  return (
    <main className="mx-auto max-w-lg px-6 py-12 pb-24">
      <div className="flex items-center justify-between gap-2">
        <Link href="/teams" className="text-sm text-gray-500 underline">
          ← All teams
        </Link>
        <Link href={`/teams/${team.id}`} className="text-sm text-gray-500 underline">
          View public profile
        </Link>
      </div>

      <div className="mt-4 flex items-center gap-3.5">
        <ClubCrest name={team.name} size={64} />
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">{team.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {city?.name ? (
              <span className="text-xs text-gray-500">{city.name}</span>
            ) : null}
            {(team.leagues ?? []).map((league: string) => (
              <Badge key={league} tone="neutral">
                {league}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-green-50 p-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" className="h-4 w-4">
            <path d="M12 3.5 5 6v6c0 4.6 3 7.8 7 9 4-1.2 7-4.4 7-9V6l-7-2.5Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-green-800">Verified-only roster visibility</p>
          <p className="mt-0.5 text-xs leading-5 text-green-900/80">
            Unverified players stay hidden from other families until you confirm them below.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <InfoTileRow>
          <InfoTile value={roster_.length} label="Players" />
          <InfoTile value={verifiedCount} label="Verified" />
          <InfoTile value={pendingCount} label="Pending" />
        </InfoTileRow>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-900">Roster</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Verify once you confirm a player belongs to this team.
        </p>
        {roster_.length > 0 ? (
          <div className="mt-3 space-y-2.5">
            {roster_.map((player) => (
              <Card key={player.id} className="p-3!">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <PlayerAvatar name={player.first_name} size={36} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {player.first_name} {player.last_initial}.
                      </p>
                      <p className="text-xs text-gray-400">
                        {player.birth_year} ·{" "}
                        {(player.positions ?? []).join(", ") || "No position listed"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold ${
                      player.team_membership_verified
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {player.team_membership_verified ? "Verified" : "Pending"}
                  </span>
                </div>
                <div className="mt-2.5 flex justify-end gap-1.5">
                  {player.team_membership_verified ? (
                    <ActionButton
                      action={unverifyTeamPlayer.bind(null, player.id, team.id)}
                      label="Unverify"
                      pendingLabel="Updating..."
                      successMessage="Unverified"
                      variant="secondary"
                      size="sm"
                    />
                  ) : (
                    <ActionButton
                      action={verifyTeamPlayer.bind(null, player.id, team.id)}
                      label="Verify"
                      pendingLabel="Verifying..."
                      successMessage="Verified — now visible to their verified teammates' families"
                      variant="accent"
                      size="sm"
                    />
                  )}
                  <ActionButton
                    action={removeTeamPlayer.bind(null, player.id, team.id)}
                    label="Remove"
                    pendingLabel="Removing..."
                    successMessage="Removed from the team"
                    confirmMessage={`Remove ${player.first_name} from ${team.name}? Their parent can add them back later.`}
                    variant="secondary"
                    size="sm"
                  />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-600">
            No players on this team yet — they show up here once a parent
            picks this team on their player&rsquo;s profile.
          </p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium text-gray-900">Team profile</h2>
        <div className="mt-3">
          <TeamProfileForm
            teamId={team.id}
            cities={cities ?? []}
            defaultValues={{
              name: team.name,
              city_id: team.city_id,
              leagues: team.leagues ?? [],
              gotsport_url: team.gotsport_url,
            }}
          />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium text-gray-900">
          Merge a duplicate team
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          If parents created more than one entry for this team, fold the
          duplicate in here. This only works on a team no other coach has
          already claimed.
        </p>
        <div className="mt-3">
          <MergeTeamForm teamId={team.id} candidates={otherTeams ?? []} />
        </div>
      </div>
    </main>
  );
}
