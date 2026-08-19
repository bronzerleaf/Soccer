"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

export async function approveOrganizationVerification(verificationId: string) {
  const { supabase, adminId } = await requireAdmin();

  const { error } = await supabase
    .from("organization_verifications")
    .update({
      status: "approved",
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", verificationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/organizations");
}

export async function rejectOrganizationVerification(verificationId: string) {
  const { supabase, adminId } = await requireAdmin();

  const { error } = await supabase
    .from("organization_verifications")
    .update({
      status: "rejected",
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", verificationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/organizations");
}
