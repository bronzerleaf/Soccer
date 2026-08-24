import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { ActionButton } from "@/components/ui/action-button";
import { approveTeamVerification, rejectTeamVerification } from "./actions";

export default async function AdminTeamsPage() {
  const { supabase } = await requireAdmin();

  const { data: pending } = await supabase
    .from("team_verifications")
    .select(
      "id, evidence, created_at, team:teams(name), coach:profiles!team_verifications_coach_id_fkey(full_name, email)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/admin" className="text-sm text-gray-500 underline">
        ← Admin
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-gray-900">
        Team verification queue
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Approve a claim only once you can confirm this coach actually runs
        the team. Once approved, they can edit the team&rsquo;s profile and
        see (and remove players from) its roster — nobody else can.
      </p>

      {pending && pending.length > 0 ? (
        <ul className="mt-8 space-y-4">
          {pending.map((item) => {
            const team = item.team as unknown as { name: string } | null;
            const coach = item.coach as unknown as {
              full_name: string;
              email: string;
            } | null;

            return (
              <li
                key={item.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <p className="text-sm font-medium text-gray-900">
                  {team?.name}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Claimed by {coach?.full_name} ({coach?.email})
                </p>
                <p className="mt-2 text-sm text-gray-700">{item.evidence}</p>

                <div className="mt-3 flex gap-2">
                  <ActionButton
                    action={approveTeamVerification.bind(null, item.id)}
                    label="Approve"
                    pendingLabel="Approving..."
                    successMessage={`${team?.name} claim approved`}
                    size="sm"
                  />
                  <ActionButton
                    action={rejectTeamVerification.bind(null, item.id)}
                    label="Reject"
                    pendingLabel="Rejecting..."
                    successMessage={`${team?.name} claim rejected`}
                    variant="secondary"
                    size="sm"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-gray-600">
          No pending team claims right now.
        </p>
      )}
    </main>
  );
}
