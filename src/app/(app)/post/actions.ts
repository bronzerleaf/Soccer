"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidTheme } from "@/lib/highlight-themes";

const POST_LIFETIME_DAYS = 30;

// Adds a highlight to the chosen player's own gallery (same write
// player_highlights already supports from the profile page) and,
// only if the parent opted in, a second insert cross-posting the same
// clip to the local feed. Two inserts, not a transaction -- if the
// second one fails the highlight itself still saved, which is the
// safer failure direction (never silently drop the parent's clip).
export async function createHighlightPost(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const playerId = String(formData.get("player_id") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  const themeRaw = String(formData.get("theme") ?? "").trim();
  const shareToFeed = formData.get("share_to_feed") === "on";
  const cityId = String(formData.get("city_id") ?? "").trim();

  if (!playerId || !url) {
    throw new Error("Choose a player and add a link before saving.");
  }
  if (shareToFeed && !cityId) {
    throw new Error("Choose a city to share this to the feed.");
  }

  const theme = isValidTheme(themeRaw) ? themeRaw : null;

  const { data: highlight, error: highlightError } = await supabase
    .from("player_highlights")
    .insert({
      player_id: playerId,
      url,
      caption: caption || null,
      theme,
    })
    .select("id")
    .single();

  if (highlightError) {
    throw new Error(highlightError.message);
  }

  if (shareToFeed) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + POST_LIFETIME_DAYS);

    const { error: feedError } = await supabase.from("feed_posts").insert({
      post_type: "highlight",
      author_id: userData.user.id,
      city_id: cityId,
      player_id: playerId,
      highlight_id: highlight.id,
      description: caption || "New highlight clip",
      expires_at: expiresAt.toISOString(),
    });

    if (feedError) {
      throw new Error(feedError.message);
    }
  }

  revalidatePath(`/players/${playerId}`);
  revalidatePath("/feed");
  redirect(`/players/${playerId}`);
}
