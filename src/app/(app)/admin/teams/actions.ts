"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

export async function approveTeamVerification(verificationId: string) {
  const { supabase, adminId } = await requireAdmin();

  const { error } = await supabase
    .from("team_verifications")
    .update({
      status: "approved",
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", verificationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/teams");
}

export async function rejectTeamVerification(verificationId: string) {
  const { supabase, adminId } = await requireAdmin();

  const { error } = await supabase
    .from("team_verifications")
    .update({
      status: "rejected",
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", verificationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/teams");
}
