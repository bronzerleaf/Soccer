"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

export async function approveTrainerVerification(verificationId: string) {
  const { supabase, adminId } = await requireAdmin();
  const { error } = await supabase
    .from("trainer_verifications")
    .update({ status: "approved", reviewed_by: adminId, reviewed_at: new Date().toISOString() })
    .eq("id", verificationId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/trainers");
}

export async function rejectTrainerVerification(verificationId: string) {
  const { supabase, adminId } = await requireAdmin();
  const { error } = await supabase
    .from("trainer_verifications")
    .update({ status: "rejected", reviewed_by: adminId, reviewed_at: new Date().toISOString() })
    .eq("id", verificationId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/trainers");
}
