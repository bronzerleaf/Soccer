import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActionButton } from "@/components/ui/action-button";
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
        .select("id, name, city_id, leagues")
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

  return (
    <main className="mx-auto max-w-lg px-6 py-12 pb-24">
      <Link href="/teams" className="text-sm text-slate-500 underline">
        ← All teams
      </Link>

      <h1 className="mt-3 text-xl font-semibold text-slate-900">
        Manage {team.name}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        You can always see and edit this roster. A player only becomes
        visible to their verified teammates&rsquo; families once you confirm
        them below — until then, nobody but you and their own parent can
        see they&rsquo;re here.
      </p>

      <div className="mt-8">
        <h2 className="text-sm font-medium text-slate-900">Team profile</h2>
        <div className="mt-3">
          <TeamProfileForm
            teamId={team.id}
            cities={cities ?? []}
            defaultValues={{
              name: team.name,
              city_id: team.city_id,
              leagues: team.leagues ?? [],
            }}
          />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium text-slate-900">Roster</h2>
        {roster && roster.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {roster.map((player) => (
              <li
                key={player.id}
                className="rounded-lg border border-slate-200 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {player.first_name} {player.last_initial}.
                    </p>
                    <p className="text-xs text-slate-500">
                      {player.birth_year} ·{" "}
                      {(player.positions ?? []).join(", ") || "No position listed"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      player.team_membership_verified
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {player.team_membership_verified ? "Verified" : "Pending"}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
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
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            No players on this team yet — they show up here once a parent
            picks this team on their player&rsquo;s profile.
          </p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium text-slate-900">
          Merge a duplicate team
        </h2>
        <p className="mt-1 text-xs text-slate-500">
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
