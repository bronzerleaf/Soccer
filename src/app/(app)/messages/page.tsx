import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CardLink } from "@/components/ui/card";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { formatRelativeTime } from "@/lib/format";

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
      "id, parent_id, coach_id, created_at, parent_last_read_at, coach_last_read_at, player:players(first_name, last_initial), roster_post:roster_posts(description), team:teams(name), feed_post:feed_posts(description)"
    )
    .order("created_at", { ascending: false });

  const conversationIds = (conversations ?? []).map((c) => c.id);

  const latestMessageByConversation = new Map<
    string,
    { body: string; created_at: string; sender_id: string }
  >();

  if (conversationIds.length > 0) {
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("conversation_id, body, created_at, sender_id")
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
      <h1 className="text-xl font-semibold text-gray-900">Messages</h1>

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
            const rosterPost = conversation.roster_post as unknown as {
              description: string;
            } | null;
            const team = conversation.team as unknown as { name: string } | null;
            const feedPost = conversation.feed_post as unknown as {
              description: string;
            } | null;
            // Exactly one of these is ever set per conversation (the
            // context that started it) -- a parent or coach glancing at
            // their inbox should never have to open a thread just to
            // find out what it's about.
            const contextLabel = player
              ? `Re: ${player.first_name} ${player.last_initial}.`
              : rosterPost
                ? `Re: "${rosterPost.description.slice(0, 40)}${rosterPost.description.length > 40 ? "…" : ""}"`
                : team
                  ? `Re: ${team.name}`
                  : feedPost
                    ? `Re: "${feedPost.description.slice(0, 40)}${feedPost.description.length > 40 ? "…" : ""}"`
                    : null;
            const latest = latestMessageByConversation.get(conversation.id);
            const myLastReadAt =
              conversation.parent_id === userId
                ? conversation.parent_last_read_at
                : conversation.coach_last_read_at;
            const isUnread =
              !!latest &&
              latest.sender_id !== userId &&
              (!myLastReadAt || new Date(latest.created_at) > new Date(myLastReadAt));

            return (
              <li key={conversation.id}>
                <CardLink href={`/messages/${conversation.id}`} className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <PlayerAvatar name={other?.full_name ?? "?"} size={44} />
                    {isUnread ? (
                      <span
                        className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-600"
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p
                        className={`truncate text-sm text-gray-900 ${isUnread ? "font-bold" : "font-semibold"}`}
                      >
                        {other?.full_name ?? "Someone"}
                      </p>
                      {latest ? (
                        <span className="shrink-0 text-[11px] text-gray-400">
                          {formatRelativeTime(latest.created_at)}
                        </span>
                      ) : null}
                    </div>
                    {contextLabel ? (
                      <p className="truncate text-xs text-gray-500">{contextLabel}</p>
                    ) : null}
                    {latest ? (
                      <p
                        className={`mt-0.5 truncate text-sm ${isUnread ? "font-semibold text-gray-900" : "text-gray-600"}`}
                      >
                        {latest.body}
                      </p>
                    ) : null}
                  </div>
                </CardLink>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-gray-600">
          No messages yet. Conversations with coaches and families will
          show up here.
        </p>
      )}
    </main>
  );
}
