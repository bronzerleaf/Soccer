"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleHighlightLike(highlightId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: existing } = await supabase
    .from("player_highlight_likes")
    .select("highlight_id")
    .eq("highlight_id", highlightId)
    .eq("profile_id", userData.user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("player_highlight_likes")
      .delete()
      .eq("highlight_id", highlightId)
      .eq("profile_id", userData.user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("player_highlight_likes")
      .insert({ highlight_id: highlightId, profile_id: userData.user.id });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/feed");
}

export async function addHighlightComment(highlightId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Write a comment first.");
  if (body.length > 500) throw new Error("Comments can be up to 500 characters.");

  const { error } = await supabase.from("player_highlight_comments").insert({
    highlight_id: highlightId,
    author_id: userData.user.id,
    body,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/feed");
}

export async function deleteHighlightComment(commentId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { error } = await supabase
    .from("player_highlight_comments")
    .delete()
    .eq("id", commentId);
  if (error) throw new Error(error.message);

  revalidatePath("/feed");
}
