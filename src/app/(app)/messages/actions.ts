"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireVerifiedCoach } from "@/lib/coach";
import { sendEmail } from "@/lib/resend/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function flagMessage(messageId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const reason = String(formData.get("reason") ?? "").trim();

  const { error } = await supabase.from("message_flags").insert({
    message_id: messageId,
    flagged_by: userData.user.id,
    reason: reason || null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function notifyOtherParticipant(
  supabase: SupabaseClient,
  conversationId: string,
  senderId: string,
  body: string
) {
  const { data: conversation } = await supabase
    .from("conversations")
    .select("parent_id, coach_id")
    .eq("id", conversationId)
    .single();

  if (!conversation) return;

  const recipientId =
    conversation.parent_id === senderId
      ? conversation.coach_id
      : conversation.parent_id;

  // Allowed by the "conversation participants read each other" policy —
  // this conversation already exists and the sender is a participant.
  const { data: recipient } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", recipientId)
    .single();

  if (!recipient) return;

  await sendEmail({
    to: recipient.email,
    subject: "New message on OpenRoster",
    text: `You have a new message: "${body}"\n\nLog in to reply: https://openroster.app/messages/${conversationId}`,
  });
}

export async function sendMessage(conversationId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const body = String(formData.get("body") ?? "").trim();
  if (!body) {
    throw new Error("Message can't be empty.");
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: userData.user.id,
    body,
  });

  if (error) {
    throw new Error(error.message);
  }

  await notifyOtherParticipant(supabase, conversationId, userData.user.id, body);

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
}

// Coach -> parent, from a player's search-result/detail page.
export async function startConversationWithParent(
  playerId: string,
  formData: FormData
) {
  const { supabase, coachId } = await requireVerifiedCoach();

  const body = String(formData.get("body") ?? "").trim();
  if (!body) {
    throw new Error("Message can't be empty.");
  }

  const { data: player } = await supabase
    .from("players")
    .select("id, parent_id, first_name")
    .eq("id", playerId)
    .single();

  if (!player) {
    throw new Error("This player is no longer visible.");
  }

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("coach_id", coachId)
    .eq("player_id", playerId)
    .maybeSingle();

  let conversationId = existing?.id as string | undefined;

  if (!conversationId) {
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({
        parent_id: player.parent_id,
        coach_id: coachId,
        player_id: playerId,
      })
      .select("id")
      .single();

    if (error || !created) {
      throw new Error(error?.message || "Could not start this conversation.");
    }
    conversationId = created.id as string;
  }

  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: coachId,
    body,
  });

  if (messageError) {
    throw new Error(messageError.message);
  }

  await notifyOtherParticipant(supabase, conversationId, coachId, body);

  revalidatePath("/messages");
  redirect(`/messages/${conversationId}`);
}

// Parent -> coach, from browsing the team list. The coach is looked up
// via get_team_coach() rather than trusted from the client — same
// reasoning as every other conversation-start path here: the server
// re-derives who's actually allowed to be the other side, never takes
// it as a form value.
export async function startConversationWithTeamCoach(
  teamId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const body = String(formData.get("body") ?? "").trim();
  if (!body) {
    throw new Error("Message can't be empty.");
  }

  const { data: coachRows } = await supabase.rpc("get_team_coach", {
    target_team_id: teamId,
  });
  const coach = coachRows?.[0] as { coach_id: string; full_name: string } | undefined;

  if (!coach) {
    throw new Error("This team doesn't have a verified coach yet.");
  }

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("parent_id", userData.user.id)
    .eq("team_id", teamId)
    .maybeSingle();

  let conversationId = existing?.id as string | undefined;

  if (!conversationId) {
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({
        parent_id: userData.user.id,
        coach_id: coach.coach_id,
        team_id: teamId,
      })
      .select("id")
      .single();

    if (error || !created) {
      throw new Error(error?.message || "Could not start this conversation.");
    }
    conversationId = created.id as string;
  }

  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: userData.user.id,
    body,
  });

  if (messageError) {
    throw new Error(messageError.message);
  }

  await notifyOtherParticipant(supabase, conversationId, userData.user.id, body);

  revalidatePath("/messages");
  redirect(`/messages/${conversationId}`);
}

// Parent -> coach, from a coach-authored guest_play/training feed post's
// detail page. The post's author is looked up server-side (never trusted
// from the client) and re-checked by feed_post_belongs_to_coach() at the
// RLS layer -- same reasoning as startConversationWithTeamCoach. There is
// deliberately no equivalent for org_event: an organization can never be
// a conversation's coach_id, so this simply fails for one, same as
// feed_post_belongs_to_coach itself never matches an org_event row.
export async function startConversationWithFeedPostAuthor(
  feedPostId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const body = String(formData.get("body") ?? "").trim();
  if (!body) {
    throw new Error("Message can't be empty.");
  }

  const { data: post } = await supabase
    .from("feed_posts")
    .select("id, author_id, post_type")
    .eq("id", feedPostId)
    .single();

  if (!post || (post.post_type !== "guest_play" && post.post_type !== "training")) {
    throw new Error("This post can't be messaged.");
  }

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("parent_id", userData.user.id)
    .eq("feed_post_id", feedPostId)
    .maybeSingle();

  let conversationId = existing?.id as string | undefined;

  if (!conversationId) {
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({
        parent_id: userData.user.id,
        coach_id: post.author_id,
        feed_post_id: feedPostId,
      })
      .select("id")
      .single();

    if (error || !created) {
      throw new Error(error?.message || "Could not start this conversation.");
    }
    conversationId = created.id as string;
  }

  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: userData.user.id,
    body,
  });

  if (messageError) {
    throw new Error(messageError.message);
  }

  await notifyOtherParticipant(supabase, conversationId, userData.user.id, body);

  revalidatePath("/messages");
  redirect(`/messages/${conversationId}`);
}

// Parent -> coach, from a roster post's detail page.
export async function startConversationWithCoach(
  rosterPostId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const body = String(formData.get("body") ?? "").trim();
  if (!body) {
    throw new Error("Message can't be empty.");
  }

  const { data: post } = await supabase
    .from("roster_posts")
    .select("id, coach_id")
    .eq("id", rosterPostId)
    .single();

  if (!post) {
    throw new Error("This roster post is no longer available.");
  }

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("parent_id", userData.user.id)
    .eq("roster_post_id", rosterPostId)
    .maybeSingle();

  let conversationId = existing?.id as string | undefined;

  if (!conversationId) {
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({
        parent_id: userData.user.id,
        coach_id: post.coach_id,
        roster_post_id: rosterPostId,
      })
      .select("id")
      .single();

    if (error || !created) {
      throw new Error(error?.message || "Could not start this conversation.");
    }
    conversationId = created.id as string;
  }

  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: userData.user.id,
    body,
  });

  if (messageError) {
    throw new Error(messageError.message);
  }

  await notifyOtherParticipant(supabase, conversationId, userData.user.id, body);

  revalidatePath("/messages");
  redirect(`/messages/${conversationId}`);
}
