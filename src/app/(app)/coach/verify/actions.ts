"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitCoachVerification(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const claimedClubId = String(formData.get("claimed_club_id") ?? "").trim();
  const evidence = String(formData.get("evidence") ?? "").trim();

  if (!claimedClubId || !evidence) {
    throw new Error("Please choose your club and describe your affiliation.");
  }

  const { error } = await supabase.from("coach_verifications").insert({
    coach_id: userData.user.id,
    claimed_club_id: claimedClubId,
    evidence,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/coach/verify");
  revalidatePath("/dashboard");
}
