"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitTrainerVerification(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const businessName = String(formData.get("business_name") ?? "").trim();
  const evidence = String(formData.get("evidence") ?? "").trim();
  if (!evidence) throw new Error("Tell us how we can verify your soccer training background.");

  const { error } = await supabase.from("trainer_verifications").insert({
    trainer_id: userData.user.id,
    business_name: businessName || null,
    evidence,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/trainer/verify");
  revalidatePath("/dashboard");
}
