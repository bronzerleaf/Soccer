"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidTheme } from "@/lib/highlight-themes";
import { findOrCreateTeam } from "@/lib/teams";

export type PlayerFormInput = {
  firstName: string;
  lastInitial: string;
  birthYear: number;
  positions: string[];
  yearsPlaying: number | null;
  playerLevel: string | null;
  preferredFoot: string | null;
  currentClubId: string | null;
  city: string;
  bio: string;
  teamName: string;
  instagramUrl: string;
  youtubeUrl: string;
};

function parseFormInput(formData: FormData): PlayerFormInput {
  const birthYear = Number(formData.get("birth_year"));
  const primaryPosition = String(formData.get("primary_position") ?? "").trim();
  const secondaryPosition = String(formData.get("secondary_position") ?? "").trim();
  const yearsPlayingRaw = String(formData.get("years_playing") ?? "").trim();

  return {
    firstName: String(formData.get("first_name") ?? "").trim(),
    lastInitial: String(formData.get("last_initial") ?? "")
      .trim()
      .slice(0, 1)
      .toUpperCase(),
    birthYear,
    // index 0 = primary, index 1 = secondary (PLAYER_AND_TEAM_MODEL.md) --
    // at most two values, secondary omitted entirely when not chosen.
    positions: [primaryPosition, secondaryPosition].filter(Boolean),
    yearsPlaying: yearsPlayingRaw ? Number(yearsPlayingRaw) : null,
    playerLevel: (formData.get("player_level") as string) || null,
    preferredFoot: (formData.get("preferred_foot") as string) || null,
    currentClubId: (formData.get("current_club_id") as string) || null,
    city: String(formData.get("city") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
    teamName: String(formData.get("team_name") ?? "").trim(),
    instagramUrl: String(formData.get("instagram_url") ?? "").trim(),
    youtubeUrl: String(formData.get("youtube_url") ?? "").trim(),
  };
}

export async function createPlayer(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

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
      years_playing: input.yearsPlaying,
      player_level: input.playerLevel,
      preferred_foot: input.preferredFoot,
      current_club_id: input.currentClubId,
      city: input.city,
      bio: input.bio || null,
      team_id: teamId,
      instagram_url: input.instagramUrl || null,
      youtube_url: input.youtubeUrl || null,
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
  if (!userData.user) {
    redirect("/login");
  }

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
      years_playing: input.yearsPlaying,
      player_level: input.playerLevel,
      preferred_foot: input.preferredFoot,
      current_club_id: input.currentClubId,
      city: input.city,
      bio: input.bio || null,
      team_id: teamId,
      instagram_url: input.instagramUrl || null,
      youtube_url: input.youtubeUrl || null,
    })
    .eq("id", playerId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/players");
  revalidatePath(`/players/${playerId}`);
}

export async function setOpenToOpportunities(playerId: string, open: boolean) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("players")
    .update({ open_to_opportunities: open })
    .eq("id", playerId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/players");
  revalidatePath(`/players/${playerId}`);
}

export async function setPlayerPhoto(playerId: string, photoPath: string | null) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("players")
    .update({ photo_url: photoPath })
    .eq("id", playerId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/players");
  revalidatePath(`/players/${playerId}`);
}

// A hard delete, per the parental-data-deletion requirement: this removes
// the row outright (and, via ON DELETE CASCADE, its consent_records) —
// nothing is soft-deleted or retained.
export async function deletePlayer(playerId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const { error } = await supabase.from("players").delete().eq("id", playerId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/players");
  redirect("/players");
}

export async function addHighlight(playerId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const url = String(formData.get("url") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  const themeRaw = String(formData.get("theme") ?? "").trim();

  if (!url) {
    throw new Error("Add a link before saving.");
  }

  const { error } = await supabase.from("player_highlights").insert({
    player_id: playerId,
    url,
    caption: caption || null,
    theme: isValidTheme(themeRaw) ? themeRaw : null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/players/${playerId}`);
}

export async function deleteHighlight(highlightId: string, playerId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("player_highlights")
    .delete()
    .eq("id", highlightId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/players/${playerId}`);
}
