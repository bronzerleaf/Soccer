import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireVerifiedCoach() {
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

  if (profile?.role !== "coach") {
    redirect("/dashboard");
  }

  const { data: verification } = await supabase
    .from("coach_verifications")
    .select("status, claimed_club_id, clubs(name, city)")
    .eq("coach_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (verification?.status !== "approved" || !verification.claimed_club_id) {
    redirect("/coach/verify");
  }

  const club = verification.clubs as unknown as {
    name: string;
    city: string;
  } | null;

  return {
    supabase,
    coachId: userData.user.id,
    clubId: verification.claimed_club_id as string,
    club,
  };
}
