"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitOrganizationVerification(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const orgName = String(formData.get("org_name") ?? "").trim();
  const evidence = String(formData.get("evidence") ?? "").trim();

  if (!orgName || !evidence) {
    throw new Error("Please enter your organization name and how we can confirm it.");
  }

  const { error } = await supabase.from("organization_verifications").insert({
    organization_id: userData.user.id,
    org_name: orgName,
    evidence,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/organization/verify");
  revalidatePath("/dashboard");
}
