"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return { supabase, adminId: userData.user.id };
}

export async function approveCoachVerification(verificationId: string) {
  const { supabase, adminId } = await requireAdmin();

  const { error } = await supabase
    .from("coach_verifications")
    .update({
      status: "approved",
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", verificationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/coaches");
}

export async function rejectCoachVerification(verificationId: string) {
  const { supabase, adminId } = await requireAdmin();

  const { error } = await supabase
    .from("coach_verifications")
    .update({
      status: "rejected",
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", verificationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/coaches");
}
