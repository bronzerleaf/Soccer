import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { ActionButton } from "@/components/ui/action-button";
import { approveCoachVerification, rejectCoachVerification } from "./actions";

export default async function AdminCoachesPage() {
  const { supabase } = await requireAdmin();

  const { data: pending } = await supabase
    .from("coach_verifications")
    .select(
      "id, evidence, created_at, coach:profiles!coach_verifications_coach_id_fkey(full_name, email), club:clubs(name, city)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/admin" className="text-sm text-gray-500 underline">
        ← Admin
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-gray-900">
        Coach verification queue
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Approve a coach only once you can confirm their club affiliation.
      </p>

      {pending && pending.length > 0 ? (
        <ul className="mt-8 space-y-4">
          {pending.map((item) => {
            const coach = item.coach as unknown as {
              full_name: string;
              email: string;
            } | null;
            const club = item.club as unknown as {
              name: string;
              city: string;
            } | null;

            return (
              <li
                key={item.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <p className="text-sm font-medium text-gray-900">
                  {coach?.full_name} · {coach?.email}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Claims: {club?.name} — {club?.city}
                </p>
                <p className="mt-2 text-sm text-gray-700">{item.evidence}</p>

                <div className="mt-3 flex gap-2">
                  <ActionButton
                    action={approveCoachVerification.bind(null, item.id)}
                    label="Approve"
                    pendingLabel="Approving..."
                    successMessage={`${coach?.full_name} approved`}
                    size="sm"
                  />
                  <ActionButton
                    action={rejectCoachVerification.bind(null, item.id)}
                    label="Reject"
                    pendingLabel="Rejecting..."
                    successMessage={`${coach?.full_name} rejected`}
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
          No pending verifications right now.
        </p>
      )}
    </main>
  );
}
