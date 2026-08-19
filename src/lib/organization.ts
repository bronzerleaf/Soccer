import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireVerifiedOrganization() {
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

  if (profile?.role !== "organization") {
    redirect("/dashboard");
  }

  const { data: verification } = await supabase
    .from("organization_verifications")
    .select("status, org_name")
    .eq("organization_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (verification?.status !== "approved") {
    redirect("/organization/verify");
  }

  return {
    supabase,
    organizationId: userData.user.id,
    orgName: verification.org_name as string,
  };
}
