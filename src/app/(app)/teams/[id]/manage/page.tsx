import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActionButton } from "@/components/ui/action-button";
import { TeamProfileForm } from "./team-profile-form";
import { MergeTeamForm } from "./merge-team-form";
import { removeTeamPlayer, verifyTeamPlayer, unverifyTeamPlayer } from "./actions";

export default async function ManageTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: isOwner } = await supabase.rpc("is_verified_team_owner", {
    check_coach_id: userData.user.id,
    check_team_id: id,
  });
  if (!isOwner) redirect("/teams");

  const [{ data: team }, { data: roster }, { data: cities }, { data: otherTeams }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, city_id, leagues, gotsport_team_id, gotsport_url")
      .eq("id", id)
      .single(),
    supabase
      .from("players")
      .select("id, first_name, last_initial, birth_year, positions, team_membership_verified")
      .eq("team_id", id)
      .order("first_name"),
    supabase.from("cities").select("id, name").order("name"),
    supabase.from("teams").select("id, name").is("merged_into_team_id", null).neq("id", id).order("name"),
  ]);

  if (!team) redirect("/teams");

  return (
    <main className="mx-auto max-w-lg px-4 pb-32 pt-7 sm:px-6">
      <Link href={`/teams/${team.id}`} className="text-sm font-semibold text-slate-500">← Team profile</Link>
      <h1 className="mt-4 text-2xl font-black text-[#0b1736]">Manage {team.name}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Edit team details, verify player membership, and add official external team references.
      </p>

      <section className="pitch-card mt-6 p-5">
        <h2 className="text-base font-black text-[#0b1736]">Team profile</h2>
        <div className="mt-4">
          <TeamProfileForm
            teamId={team.id}
            cities={cities ?? []}
            defaultValues={{
              name: team.name,
              city_id: team.city_id,
              leagues: team.leagues ?? [],
              gotsport_team_id: team.gotsport_team_id,
              gotsport_url: team.gotsport_url,
            }}
          />
        </div>
      </section>

      <section className="pitch-card mt-6 p-5">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-base font-black text-[#0b1736]">Roster verification</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              A player only appears to other verified families on this team after you confirm membership.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{roster?.length ?? 0}</span>
        </div>

        {roster && roster.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {roster.map((player) => (
              <li key={player.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-[#0b1736]">{player.first_name} {player.last_initial}.</p>
                    <p className="mt-1 text-xs text-slate-500">{player.birth_year} · {(player.positions ?? []).join(" · ") || "Position not listed"}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${player.team_membership_verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                    {player.team_membership_verified ? "Verified" : "Pending"}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  {player.team_membership_verified ? (
                    <ActionButton action={unverifyTeamPlayer.bind(null, player.id, team.id)} label="Unverify" pendingLabel="Updating..." successMessage="Unverified" variant="secondary" size="sm" />
                  ) : (
                    <ActionButton action={verifyTeamPlayer.bind(null, player.id, team.id)} label="Verify player" pendingLabel="Verifying..." successMessage="Verified" size="sm" />
                  )}
                  <ActionButton
                    action={removeTeamPlayer.bind(null, player.id, team.id)}
                    label="Remove"
                    pendingLabel="Removing..."
                    successMessage="Removed"
                    confirmMessage={`Remove ${player.first_name} from ${team.name}?`}
                    variant="secondary"
                    size="sm"
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No players have selected this team yet.</p>
        )}
      </section>

      <section className="pitch-card mt-6 p-5">
        <h2 className="text-base font-black text-[#0b1736]">Merge duplicate team</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">Fold an unclaimed duplicate team record into this verified team.</p>
        <div className="mt-4"><MergeTeamForm teamId={team.id} candidates={otherTeams ?? []} /></div>
      </section>
    </main>
  );
}
