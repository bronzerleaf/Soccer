"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitTeamClaim(teamId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const evidence = String(formData.get("evidence") ?? "").trim();

  if (!evidence) {
    throw new Error("Let us know how we can confirm you coach this team.");
  }

  const { error } = await supabase.from("team_verifications").insert({
    team_id: teamId,
    coach_id: userData.user.id,
    evidence,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/teams");
}
