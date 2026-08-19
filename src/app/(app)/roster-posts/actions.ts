"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireVerifiedCoach } from "@/lib/coach";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendEmail } from "@/lib/resend/server";

const POST_LIFETIME_DAYS = 30;

// The match query reuses the *coach's own* authenticated session — the
// existing players RLS policy already lets a verified coach see every
// open + consented row for this birth year, so no service role is
// needed to find who matches. It's only needed for the next step:
// looking up each matching parent's email, which the coach's own
// session can't do (no conversation exists between them yet).
async function notifyMatchingParents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  birthYear: number,
  clubName: string
) {
  const { data: matches } = await supabase
    .from("players")
    .select("parent_id")
    .eq("birth_year", birthYear)
    .eq("open_to_opportunities", true)
    .eq("consent_completed", true);

  const parentIds = [...new Set((matches ?? []).map((m) => m.parent_id))];
  if (parentIds.length === 0) return;

  const serviceRole = createServiceRoleClient();
  const { data: parents } = await serviceRole
    .from("profiles")
    .select("email, full_name")
    .in("id", parentIds);

  for (const parent of parents ?? []) {
    await sendEmail({
      to: parent.email,
      subject: "A new roster spot matches your player",
      text: `${clubName} just posted an open roster spot for the ${birthYear} age group. Log in to OpenRoster to see the details and reach out: https://openroster.app/feed`,
    });
  }
}

export async function createRosterPost(formData: FormData) {
  const { supabase, coachId, clubId, club } = await requireVerifiedCoach();

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

  await notifyMatchingParents(supabase, birthYear, club?.name ?? "A club");

  revalidatePath("/feed");
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

  revalidatePath("/feed");
  revalidatePath("/roster-posts/mine");
}

// A single toggle rather than separate like/unlike actions, same
// pattern as toggleFeedPostLike — check server-side whether the caller
// has already liked it and flip it.
export async function toggleRosterPostLike(postId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const { data: existing } = await supabase
    .from("roster_post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("profile_id", userData.user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("roster_post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("profile_id", userData.user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("roster_post_likes")
      .insert({ post_id: postId, profile_id: userData.user.id });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/feed");
  revalidatePath(`/roster-posts/${postId}`);
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

  revalidatePath("/feed");
  revalidatePath("/roster-posts/mine");
}
