import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { ActionButton } from "@/components/ui/action-button";
import { dismissFlag } from "./actions";

export default async function AdminMessagesPage() {
  const { supabase } = await requireAdmin();

  const { data: flags } = await supabase
    .from("message_flags")
    .select(
      "id, reason, created_at, flagged_by, message:messages(id, body, sender_id, conversation_id)"
    )
    .order("created_at", { ascending: false });

  const profileIds = new Set<string>();
  for (const flag of flags ?? []) {
    profileIds.add(flag.flagged_by);
    const message = flag.message as unknown as { sender_id: string } | null;
    if (message) profileIds.add(message.sender_id);
  }

  const profileById = new Map<string, { full_name: string }>();
  if (profileIds.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", [...profileIds]);
    for (const profile of profiles ?? []) {
      profileById.set(profile.id, profile);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/admin" className="text-sm text-gray-500 underline">
        ← Admin
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-gray-900">
        Flagged messages
      </h1>

      {flags && flags.length > 0 ? (
        <ul className="mt-8 space-y-4">
          {flags.map((flag) => {
            const message = flag.message as unknown as {
              id: string;
              body: string;
              sender_id: string;
              conversation_id: string;
            } | null;
            const sender = message
              ? profileById.get(message.sender_id)
              : null;
            const reporter = profileById.get(flag.flagged_by);

            return (
              <li
                key={flag.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <p className="text-xs text-gray-500">
                  Reported by {reporter?.full_name ?? "someone"}
                  {flag.reason ? ` — "${flag.reason}"` : ""}
                </p>
                <p className="mt-2 text-sm text-gray-900">
                  <span className="font-medium">
                    {sender?.full_name ?? "Someone"}:
                  </span>{" "}
                  {message?.body ?? "(message no longer available)"}
                </p>
                <div className="mt-3 flex gap-2">
                  {message ? (
                    <Link
                      href={`/messages/${message.conversation_id}`}
                      className="text-sm text-gray-700 underline"
                    >
                      View conversation
                    </Link>
                  ) : null}
                  <ActionButton
                    action={dismissFlag.bind(null, flag.id)}
                    label="Dismiss"
                    pendingLabel="Dismissing..."
                    successMessage="Flag dismissed"
                    variant="ghost"
                    size="sm"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-gray-600">No flagged messages.</p>
      )}
    </main>
  );
}
