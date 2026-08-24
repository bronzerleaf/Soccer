import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { ActionButton } from "@/components/ui/action-button";
import {
  approveOrganizationVerification,
  rejectOrganizationVerification,
} from "./actions";

export default async function AdminOrganizationsPage() {
  const { supabase } = await requireAdmin();

  const { data: pending } = await supabase
    .from("organization_verifications")
    .select(
      "id, org_name, evidence, created_at, organization:profiles!organization_verifications_organization_id_fkey(full_name, email)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/admin" className="text-sm text-gray-500 underline">
        ← Admin
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-gray-900">
        Organization verification queue
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Approve an organization only once you can confirm it&rsquo;s real.
        Organizations never get access to player search or messaging —
        approving one only lets it post tournament/event listings to the
        local feed.
      </p>

      {pending && pending.length > 0 ? (
        <ul className="mt-8 space-y-4">
          {pending.map((item) => {
            const org = item.organization as unknown as {
              full_name: string;
              email: string;
            } | null;

            return (
              <li
                key={item.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <p className="text-sm font-medium text-gray-900">
                  {item.org_name}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Submitted by {org?.full_name} ({org?.email})
                </p>
                <p className="mt-2 text-sm text-gray-700">{item.evidence}</p>

                <div className="mt-3 flex gap-2">
                  <ActionButton
                    action={approveOrganizationVerification.bind(null, item.id)}
                    label="Approve"
                    pendingLabel="Approving..."
                    successMessage={`${item.org_name} approved`}
                    size="sm"
                  />
                  <ActionButton
                    action={rejectOrganizationVerification.bind(null, item.id)}
                    label="Reject"
                    pendingLabel="Rejecting..."
                    successMessage={`${item.org_name} rejected`}
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
