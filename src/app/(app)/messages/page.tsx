import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MessagesInboxPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const userId = userData.user.id;

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, parent_id, coach_id, created_at, player:players(first_name, last_initial), roster_post:roster_posts(description), team:teams(name), feed_post:feed_posts(description)")
    .order("created_at", { ascending: false });

  const conversationIds = (conversations ?? []).map((conversation) => conversation.id);
  const latestMessageByConversation = new Map<string, { body: string; created_at: string }>();
  if (conversationIds.length > 0) {
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("conversation_id, body, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });
    for (const message of recentMessages ?? []) {
      if (!latestMessageByConversation.has(message.conversation_id)) latestMessageByConversation.set(message.conversation_id, message);
    }
  }

  const otherPartyIds = (conversations ?? []).map((conversation) => conversation.parent_id === userId ? conversation.coach_id : conversation.parent_id);
  const otherPartyById = new Map<string, { full_name: string; role: string }>();
  if (otherPartyIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, role").in("id", otherPartyIds);
    for (const profile of profiles ?? []) otherPartyById.set(profile.id, profile);
  }

  return (
    <main className="mx-auto max-w-lg px-4 pb-32 pt-8 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">PitchLink</p>
      <h1 className="mt-1 text-2xl font-black text-[#0b1736]">Messages</h1>

      {conversations && conversations.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {conversations.map((conversation) => {
            const otherId = conversation.parent_id === userId ? conversation.coach_id : conversation.parent_id;
            const other = otherPartyById.get(otherId);
            const player = conversation.player as unknown as { first_name: string; last_initial: string } | null;
            const rosterPost = conversation.roster_post as unknown as { description: string } | null;
            const team = conversation.team as unknown as { name: string } | null;
            const feedPost = conversation.feed_post as unknown as { description: string } | null;
            const contextLabel = player
              ? `Re: ${player.first_name} ${player.last_initial}.`
              : rosterPost ? `Re: ${rosterPost.description.slice(0, 42)}${rosterPost.description.length > 42 ? "…" : ""}`
              : team ? `Re: ${team.name}`
              : feedPost ? `Re: ${feedPost.description.slice(0, 42)}${feedPost.description.length > 42 ? "…" : ""}`
              : "Opportunity conversation";
            const latest = latestMessageByConversation.get(conversation.id);
            const roleLabel = other?.role === "trainer" ? "Trainer" : other?.role === "organization" ? "Organization" : other?.role === "coach" ? "Coach" : "Parent";

            return (
              <li key={conversation.id}>
                <Link href={`/messages/${conversation.id}`} className="pitch-card block p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-[#0b1736]">{other?.full_name ?? "PitchLink member"}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600">{roleLabel}</p>
                    </div>
                    <span className="max-w-[55%] truncate text-[10px] text-slate-400">{contextLabel}</span>
                  </div>
                  {latest ? <p className="mt-2 truncate text-sm text-slate-600">{latest.body}</p> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="pitch-card mt-6 p-7 text-center">
          <div className="text-3xl">💬</div>
          <p className="mt-3 text-sm font-black text-[#0b1736]">No conversations yet</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">Conversations with families and verified soccer professionals will appear here.</p>
        </div>
      )}
    </main>
  );
}
