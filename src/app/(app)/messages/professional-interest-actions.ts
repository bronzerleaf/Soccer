"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function startConversationFromOpportunityInterest(
  interestId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Message can't be empty.");

  const { data: interest } = await supabase
    .from("opportunity_interests")
    .select("id, parent_id, roster_post_id, feed_post_id")
    .eq("id", interestId)
    .single();
  if (!interest) throw new Error("This interest is no longer available.");

  let professionalId: string | null = null;
  if (interest.roster_post_id) {
    const { data: post } = await supabase
      .from("roster_posts")
      .select("coach_id")
      .eq("id", interest.roster_post_id)
      .single();
    professionalId = post?.coach_id ?? null;
  } else if (interest.feed_post_id) {
    const { data: post } = await supabase
      .from("feed_posts")
      .select("author_id")
      .eq("id", interest.feed_post_id)
      .single();
    professionalId = post?.author_id ?? null;
  }

  if (!professionalId) throw new Error("The opportunity author is no longer available.");
  if (userData.user.id !== interest.parent_id && userData.user.id !== professionalId) {
    throw new Error("You are not part of this opportunity conversation.");
  }

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("opportunity_interest_id", interestId)
    .maybeSingle();

  let conversationId = existing?.id as string | undefined;
  if (!conversationId) {
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({
        parent_id: interest.parent_id,
        coach_id: professionalId,
        opportunity_interest_id: interestId,
      })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message || "Could not start this conversation.");
    conversationId = created.id as string;
  }

  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: userData.user.id,
    body,
  });
  if (messageError) throw new Error(messageError.message);

  revalidatePath("/messages");
  redirect(`/messages/${conversationId}`);
}
