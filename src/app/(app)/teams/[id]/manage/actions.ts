"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateTeamProfile(teamId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const name = String(formData.get("name") ?? "").trim();
  const cityId = (formData.get("city_id") as string) || null;
  const leagues = String(formData.get("leagues") ?? "")
    .split(",")
    .map((league) => league.trim())
    .filter(Boolean);

  if (!name) {
    throw new Error("Give the team a name.");
  }

  const { error } = await supabase
    .from("teams")
    .update({ name, city_id: cityId, leagues })
    .eq("id", teamId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/teams/${teamId}/manage`);
  revalidatePath("/teams");
}

export async function removeTeamPlayer(playerId: string, teamId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("remove_player_from_team", {
    target_player_id: playerId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/teams/${teamId}/manage`);
}

export async function mergeTeam(sourceTeamId: string, targetTeamId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("merge_unclaimed_team_into", {
    source_team_id: sourceTeamId,
    target_team_id: targetTeamId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/teams/${targetTeamId}/manage`);
  revalidatePath("/teams");
}
