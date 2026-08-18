"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireVerifiedCoach } from "@/lib/coach";
import { createClient } from "@/lib/supabase/server";

const POST_LIFETIME_DAYS = 30;

export async function createRosterPost(formData: FormData) {
  const { supabase, coachId, clubId } = await requireVerifiedCoach();

  const birthYear = Number(formData.get("birth_year"));
  const positions = formData.getAll("positions").map(String);
  const tryoutDate = String(formData.get("tryout_date") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!description) {
    throw new Error("Please describe the roster spot.");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + POST_LIFETIME_DAYS);

  const { error } = await supabase.from("roster_posts").insert({
    coach_id: coachId,
    club_id: clubId,
    birth_year: birthYear,
    positions,
    tryout_date: tryoutDate || null,
    description,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/roster-posts");
  redirect("/roster-posts/mine");
}

export async function expireRosterPost(postId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("roster_posts")
    .update({ expires_at: new Date().toISOString() })
    .eq("id", postId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/roster-posts");
  revalidatePath("/roster-posts/mine");
}

export async function deleteRosterPost(postId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const { error } = await supabase.from("roster_posts").delete().eq("id", postId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/roster-posts");
  revalidatePath("/roster-posts/mine");
}
