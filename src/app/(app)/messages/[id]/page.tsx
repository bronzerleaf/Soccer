import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendMessage } from "../actions";
import { FlagMessageButton } from "./flag-message-button";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const userId = userData.user.id;

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, parent_id, coach_id, player:players(first_name, last_initial), roster_post:roster_posts(description), team:teams(name), feed_post:feed_posts(description)")
    .eq("id", id)
    .single();
  if (!conversation) notFound();

  const isParticipant = conversation.parent_id === userId || conversation.coach_id === userId;
  let headerName: string;
  if (isParticipant) {
    const otherId = conversation.parent_id === userId ? conversation.coach_id : conversation.parent_id;
    const { data: other } = await supabase.from("profiles").select("full_name").eq("id", otherId).single();
    headerName = other?.full_name ?? "Conversation";
  } else {
    const { data: participants } = await supabase.from("profiles").select("id, full_name").in("id", [conversation.parent_id, conversation.coach_id]);
    const byId = new Map((participants ?? []).map((person) => [person.id, person.full_name]));
    headerName = `${byId.get(conversation.parent_id) ?? "Parent"} & ${byId.get(conversation.coach_id) ?? "Soccer professional"}`;
  }

  const { data: messages } = await supabase.from("messages").select("id, sender_id, body, created_at").eq("conversation_id", id).order("created_at", { ascending: true });
  const player = conversation.player as unknown as { first_name: string; last_initial: string } | null;
  const rosterPost = conversation.roster_post as unknown as { description: string } | null;
  const team = conversation.team as unknown as { name: string } | null;
  const feedPost = conversation.feed_post as unknown as { description: string } | null;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-4 pb-32 pt-7 sm:px-6">
      <Link href="/messages" className="text-sm font-semibold text-slate-500">← Messages</Link>
      <h1 className="mt-4 text-xl font-black text-[#0b1736]">{headerName}</h1>
      {player ? <p className="mt-1 text-xs text-slate-500">About {player.first_name} {player.last_initial}.</p> : null}
      {rosterPost ? <p className="mt-1 text-xs text-slate-500">Re: “{rosterPost.description}”</p> : null}
      {team ? <p className="mt-1 text-xs text-slate-500">About {team.name}</p> : null}
      {feedPost ? <p className="mt-1 text-xs text-slate-500">Re: “{feedPost.description}”</p> : null}

      <div className="mt-6 flex-1 space-y-3">
        {(messages ?? []).map((message) => {
          const isMine = message.sender_id === userId;
          return (
            <div key={message.id} className={isMine ? "ml-auto max-w-[82%]" : "max-w-[82%]"}>
              <div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${isMine ? "rounded-br-md bg-[#0b1736] text-white" : "rounded-bl-md border border-slate-100 bg-white text-slate-800 shadow-sm"}`}>{message.body}</div>
              {!isMine && isParticipant ? <FlagMessageButton messageId={message.id} /> : null}
            </div>
          );
        })}
      </div>

      {isParticipant ? (
        <form action={sendMessage.bind(null, id)} className="mt-6 flex gap-2 border-t border-slate-200 pt-4">
          <textarea name="body" rows={2} required placeholder="Write a reply..." className="block w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400" />
          <button type="submit" className="shrink-0 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">Send</button>
        </form>
      ) : null}
    </main>
  );
}
