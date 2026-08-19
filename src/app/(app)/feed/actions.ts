"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const POST_LIFETIME_DAYS = 30;

export async function setLocationPreference(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const homeCityId = String(formData.get("home_city_id") ?? "").trim();
  const radiusRaw = String(formData.get("radius_miles") ?? "").trim();
  const radiusMiles = radiusRaw ? Number(radiusRaw) : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      home_city_id: homeCityId || null,
      radius_miles: radiusMiles,
    })
    .eq("id", userData.user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/feed");
}

// looking_for_team / guest_play only — a parent posting about their own,
// already-consented player. Birth year and positions are read from the
// player record itself rather than re-entered, so the feed card can never
// drift from what the profile already says.
export async function createFamilyFeedPost(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const postType = String(formData.get("post_type") ?? "");
  if (postType !== "looking_for_team" && postType !== "guest_play") {
    throw new Error("Unknown post type.");
  }

  const playerId = String(formData.get("player_id") ?? "").trim();
  const cityId = String(formData.get("city_id") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!playerId || !cityId || !description) {
    throw new Error("Please choose a player, a city, and add a description.");
  }

  const { data: player } = await supabase
    .from("players")
    .select("birth_year, positions")
    .eq("id", playerId)
    .single();

  if (!player) {
    throw new Error("Player not found.");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + POST_LIFETIME_DAYS);

  const { error } = await supabase.from("feed_posts").insert({
    post_type: postType,
    author_id: userData.user.id,
    city_id: cityId,
    player_id: playerId,
    birth_year: player.birth_year,
    positions: player.positions ?? [],
    description,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/feed");
  redirect("/feed");
}

// org_event only — a verified organization posting a tournament/event
// listing. No player involved.
export async function createOrgEventPost(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const cityId = String(formData.get("city_id") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!cityId || !description) {
    throw new Error("Please choose a city and describe the event.");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + POST_LIFETIME_DAYS);

  const { error } = await supabase.from("feed_posts").insert({
    post_type: "org_event",
    author_id: userData.user.id,
    city_id: cityId,
    description,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/feed");
  redirect("/feed");
}

export async function deleteFeedPost(postId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const { error } = await supabase.from("feed_posts").delete().eq("id", postId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/feed");
}

// A single toggle rather than separate like/unlike actions: check
// server-side whether the caller has already liked this post and flip it,
// so the client never has to keep its own like-state in sync by hand.
export async function toggleFeedPostLike(postId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const { data: existing } = await supabase
    .from("feed_post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("profile_id", userData.user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("feed_post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("profile_id", userData.user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("feed_post_likes")
      .insert({ post_id: postId, profile_id: userData.user.id });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/feed");
}
