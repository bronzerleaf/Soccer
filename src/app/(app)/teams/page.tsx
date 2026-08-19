import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClaimTeamForm } from "./claim-team-form";

export default async function TeamsPage() {
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
