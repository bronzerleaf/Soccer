import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MessagesInboxPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const userId = userData.user.id;

  const { data: conversations } = await supabase
    .from("conversations")
    .select(
      "id, parent_id, coach_id, created_at, player:players(first_name, last_initial)"
    )
    .order("created_at", { ascending: false });

  const conversationIds = (conversations ?? []).map((c) => c.id);

  const latestMessageByConversation = new Map<
    string,
    { body: string; created_at: string }
  >();

  if (conversationIds.length > 0) {
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("conversation_id, body, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    for (const message of recentMessages ?? []) {
      if (!latestMessageByConversation.has(message.conversation_id)) {
        latestMessageByConversation.set(message.conversation_id, message);
      }
    }
  }

  const otherPartyIds = (conversations ?? []).map((c) =>
    c.parent_id === userId ? c.coach_id : c.parent_id
  );

  const otherPartyById = new Map<string, { full_name: string }>();
  if (otherPartyIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", otherPartyIds);
    for (const profile of profiles ?? []) {
      otherPartyById.set(profile.id, profile);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-xl font-semibold text-slate-900">Messages</h1>

      {conversations && conversations.length > 0 ? (
        <ul className="mt-8 space-y-3">
          {conversations.map((conversation) => {
            const otherId =
              conversation.parent_id === userId
                ? conversation.coach_id
                : conversation.parent_id;
            const other = otherPartyById.get(otherId);
            const player = conversation.player as unknown as {
              first_name: string;
              last_initial: string;
            } | null;
            const latest = latestMessageByConversation.get(conversation.id);

            return (
              <li key={conversation.id}>
                <Link
                  href={`/messages/${conversation.id}`}
                  className="block rounded-lg border border-slate-200 p-4 hover:border-slate-300"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">
                      {other?.full_name ?? "Someone"}
                    </p>
                    {player ? (
                      <span className="text-xs text-slate-500">
                        Re: {player.first_name} {player.last_initial}.
                      </span>
                    ) : null}
                  </div>
                  {latest ? (
                    <p className="mt-1 truncate text-sm text-slate-600">
                      {latest.body}
                    </p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-slate-600">
          No messages yet. Conversations with coaches and families will
          show up here.
        </p>
      )}
    </main>
  );
}
