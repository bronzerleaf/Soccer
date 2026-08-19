"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidTheme } from "@/lib/highlight-themes";

export type PlayerFormInput = {
  firstName: string;
  lastInitial: string;
  birthYear: number;
  positions: string[];
  preferredFoot: string | null;
  currentClubId: string | null;
  city: string;
  bio: string;
};

function parseFormInput(formData: FormData): PlayerFormInput {
  const birthYear = Number(formData.get("birth_year"));

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
  };
}

export async function createPlayer(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const input = parseFormInput(formData);

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
