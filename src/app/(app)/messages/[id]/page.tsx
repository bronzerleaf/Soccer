import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendMessage } from "../actions";
import { FlagMessageButton } from "./flag-message-button";
import { PlayerAvatar } from "@/components/ui/player-avatar";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const userId = userData.user.id;

  const { data: conversation } = await supabase
    .from("conversations")
    .select(
      "id, parent_id, coach_id, player:players(first_name, last_initial), roster_post:roster_posts(description), team:teams(name), feed_post:feed_posts(description)"
    )
    .eq("id", id)
    .single();

  if (!conversation) {
    notFound();
  }

  const isParticipant =
    conversation.parent_id === userId || conversation.coach_id === userId;

  // A non-participant who can still load this page is an admin viewing
  // it for moderation (the only other SELECT grant on conversations) —
  // show both names and no reply form, rather than guessing which side
  // is "the other one" or offering a reply that RLS would just reject.
  let headerName: string;
  if (isParticipant) {
    const otherId =
      conversation.parent_id === userId
        ? conversation.coach_id
        : conversation.parent_id;
    const { data: other } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", otherId)
      .single();
    headerName = other?.full_name ?? "Conversation";
  } else {
    const { data: participants } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", [conversation.parent_id, conversation.coach_id]);
    const byId = new Map((participants ?? []).map((p) => [p.id, p.full_name]));
    headerName = `${byId.get(conversation.parent_id) ?? "Parent"} & ${
      byId.get(conversation.coach_id) ?? "Coach"
    }`;
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

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

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-12">
      <Link href="/messages" className="text-sm text-slate-500 underline">
        ← Back to messages
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <PlayerAvatar name={headerName} size={40} />
        <h1 className="text-lg font-semibold text-slate-900">{headerName}</h1>
      </div>
      {player ? (
        <p className="mt-1 text-sm text-slate-500">
          About {player.first_name} {player.last_initial}.
        </p>
      ) : null}
      {rosterPost ? (
        <p className="mt-1 text-sm text-slate-500">
          Re: &ldquo;{rosterPost.description}&rdquo;
        </p>
      ) : null}
      {team ? (
        <p className="mt-1 text-sm text-slate-500">About {team.name}</p>
      ) : null}
      {feedPost ? (
        <p className="mt-1 text-sm text-slate-500">
          Re: &ldquo;{feedPost.description}&rdquo;
        </p>
      ) : null}

      <div className="mt-6 flex-1 space-y-3">
        {(messages ?? []).map((message) => {
          const isMine = message.sender_id === userId;
          return (
            <div key={message.id} className={isMine ? "ml-auto max-w-[80%]" : "max-w-[80%]"}>
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                  isMine
                    ? "rounded-br-sm bg-emerald-600 text-white"
                    : "rounded-bl-sm border border-slate-200 bg-white text-slate-900"
                }`}
              >
                {message.body}
              </div>
              <p className={`mt-1 text-[11px] text-slate-400 ${isMine ? "text-right" : ""}`}>
                {formatTime(message.created_at)}
              </p>
              {!isMine && isParticipant ? (
                <FlagMessageButton messageId={message.id} />
              ) : null}
            </div>
          );
        })}
      </div>

      {isParticipant ? (
        <form
          action={sendMessage.bind(null, id)}
          className="mt-6 flex gap-2 border-t border-slate-200 pt-4"
        >
          <textarea
            name="body"
            rows={2}
            required
            placeholder="Write a reply..."
            className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Send
          </button>
        </form>
      ) : null}
    </main>
  );
}
