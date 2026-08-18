import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendMessage } from "../actions";

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
      "id, parent_id, coach_id, player:players(first_name, last_initial), roster_post:roster_posts(description)"
    )
    .eq("id", id)
    .single();

  if (!conversation) {
    notFound();
  }

  const otherId =
    conversation.parent_id === userId
      ? conversation.coach_id
      : conversation.parent_id;

  const { data: other } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", otherId)
    .single();

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

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-12">
      <Link href="/messages" className="text-sm text-slate-500 underline">
        ← Back to messages
      </Link>

      <h1 className="mt-3 text-xl font-semibold text-slate-900">
        {other?.full_name ?? "Conversation"}
      </h1>
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

      <div className="mt-6 flex-1 space-y-3">
        {(messages ?? []).map((message) => {
          const isMine = message.sender_id === userId;
          return (
            <div
              key={message.id}
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                isMine
                  ? "ml-auto bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-900"
              }`}
            >
              {message.body}
            </div>
          );
        })}
      </div>

      <form
        action={sendMessage.bind(null, id)}
        className="mt-6 flex gap-2 border-t border-slate-200 pt-4"
      >
        <textarea
          name="body"
          rows={2}
          required
          placeholder="Write a reply..."
          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Send
        </button>
      </form>
    </main>
  );
}
