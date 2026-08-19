"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidTheme } from "@/lib/highlight-themes";
import { findOrCreateTeam } from "@/lib/teams";
import { LEVELS_OF_PLAY } from "./constants";

const VALID_LEVELS = new Set<string>(LEVELS_OF_PLAY.map((level) => level.value));

export type PlayerFormInput = {
  firstName: string;
  lastInitial: string;
  birthYear: number;
  positions: string[];
  preferredFoot: string | null;
  currentClubId: string | null;
  city: string;
  bio: string;
  teamName: string;
  instagramUrl: string;
  youtubeUrl: string;
  yearsExperience: number | null;
  levelOfPlay: string | null;
};

function parseFormInput(formData: FormData): PlayerFormInput {
  const birthYear = Number(formData.get("birth_year"));
  const yearsRaw = String(formData.get("years_experience") ?? "").trim();
  const levelRaw = String(formData.get("level_of_play") ?? "").trim();
  const yearsExperience = yearsRaw === "" ? null : Number(yearsRaw);

  if (yearsExperience !== null && (!Number.isInteger(yearsExperience) || yearsExperience < 0 || yearsExperience > 18)) {
    throw new Error("Years of experience must be between 0 and 18.");
  }
  if (levelRaw && !VALID_LEVELS.has(levelRaw)) {
    throw new Error("Choose a valid level of play.");
  }

  return {
    firstName: String(formData.get("first_name") ?? "").trim(),
    lastInitial: String(formData.get("last_initial") ?? "")
      .trim()
      .slice(0, 1)
      .toUpperCase(),
    birthYear,
    positions: formData.getAll("positions").map(String),
    preferredFoot: (formData.get("preferred_foot") as string) || null,
    currentClubId: (formData.get("current_club_id") as string) || null,
    city: String(formData.get("city") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
    teamName: String(formData.get("team_name") ?? "").trim(),
    instagramUrl: String(formData.get("instagram_url") ?? "").trim(),
    youtubeUrl: String(formData.get("youtube_url") ?? "").trim(),
    yearsExperience,
    levelOfPlay: levelRaw || null,
  };
}

export async function createPlayer(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const input = parseFormInput(formData);
  const teamId = input.teamName
    ? await findOrCreateTeam(supabase, input.teamName, userData.user.id)
    : null;

  const { data, error } = await supabase
    .from("players")
    .insert({
      parent_id: userData.user.id,
      first_name: input.firstName,
      last_initial: input.lastInitial,
      birth_year: input.birthYear,
      positions: input.positions,
      preferred_foot: input.preferredFoot,
      current_club_id: input.currentClubId,
      city: input.city,
      bio: input.bio || null,
      team_id: teamId,
      instagram_url: input.instagramUrl || null,
      youtube_url: input.youtubeUrl || null,
      years_experience: input.yearsExperience,
      level_of_play: input.levelOfPlay,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not create the player profile.");
  }

  revalidatePath("/players");
  return { id: data.id as string };
}

export async function updatePlayer(playerId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const input = parseFormInput(formData);
  const teamId = input.teamName
    ? await findOrCreateTeam(supabase, input.teamName, userData.user.id)
    : null;

  const { error } = await supabase
    .from("players")
    .update({
      first_name: input.firstName,
      last_initial: input.lastInitial,
      birth_year: input.birthYear,
      positions: input.positions,
      preferred_foot: input.preferredFoot,
      current_club_id: input.currentClubId,
      city: input.city,
      bio: input.bio || null,
      team_id: teamId,
      instagram_url: input.instagramUrl || null,
      youtube_url: input.youtubeUrl || null,
      years_experience: input.yearsExperience,
      level_of_play: input.levelOfPlay,
    })
    .eq("id", playerId);

  if (error) throw new Error(error.message);

  revalidatePath("/players");
  revalidatePath(`/players/${playerId}`);
  revalidatePath("/search");
}

// `open_to_opportunities` is retained as the hardened database/RLS gate,
// but product copy treats it as a private discoverability setting. It is
// never rendered as an availability badge on the player's public-facing
// profile.
export async function setSearchable(playerId: string, searchable: boolean) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { error } = await supabase
    .from("players")
    .update({ open_to_opportunities: searchable })
    .eq("id", playerId);

  if (error) throw new Error(error.message);

  revalidatePath("/players");
  revalidatePath(`/players/${playerId}`);
  revalidatePath("/search");
}

// Backwards-compatible export for any existing call site we have not yet
// migrated to the new product wording.
export const setOpenToOpportunities = setSearchable;

export async function setPlayerPhoto(playerId: string, photoPath: string | null) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { error } = await supabase
    .from("players")
    .update({ photo_url: photoPath })
    .eq("id", playerId);

  if (error) throw new Error(error.message);

  revalidatePath("/players");
  revalidatePath(`/players/${playerId}`);
}

export async function deletePlayer(playerId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { error } = await supabase.from("players").delete().eq("id", playerId);
  if (error) throw new Error(error.message);

  revalidatePath("/players");
  redirect("/players");
}

export async function addHighlight(playerId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const url = String(formData.get("url") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  const themeRaw = String(formData.get("theme") ?? "").trim();
  const showInFeed = String(formData.get("visibility") ?? "profile") === "feed";

  if (!url) throw new Error("Add a clip link before saving.");
  if (!isValidTheme(themeRaw)) throw new Error("Choose a theme for this clip.");

  const { error } = await supabase.from("player_highlights").insert({
    player_id: playerId,
    url,
    caption: caption || null,
    theme: themeRaw,
    show_in_feed: showInFeed,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/players/${playerId}`);
  if (showInFeed) revalidatePath("/feed");
}

export async function setHighlightFeedVisibility(
  highlightId: string,
  playerId: string,
  showInFeed: boolean
) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { error } = await supabase
    .from("player_highlights")
    .update({ show_in_feed: showInFeed })
    .eq("id", highlightId)
    .eq("player_id", playerId);

  if (error) throw new Error(error.message);

  revalidatePath(`/players/${playerId}`);
  revalidatePath("/feed");
}

export async function deleteHighlight(highlightId: string, playerId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { error } = await supabase
    .from("player_highlights")
    .delete()
    .eq("id", highlightId);

  if (error) throw new Error(error.message);

  revalidatePath(`/players/${playerId}`);
  revalidatePath("/feed");
}
