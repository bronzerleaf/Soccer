import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/ui/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    // Not signed in — the page itself will redirect to /login. Render
    // without the nav rather than duplicating that redirect here.
    return <>{children}</>;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  const role = (profile?.role ?? "parent") as
    | "parent"
    | "coach"
    | "admin"
    | "organization";

  let coachApproved = false;
  if (role === "coach") {
    const { data: verification } = await supabase
      .from("coach_verifications")
      .select("status")
      .eq("coach_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    coachApproved = verification?.status === "approved";
  }

  let organizationApproved = false;
  if (role === "organization") {
    const { data: verification } = await supabase
      .from("organization_verifications")
      .select("status")
      .eq("organization_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    organizationApproved = verification?.status === "approved";
  }

  return (
    <>
      <div className="pb-16">{children}</div>
      <BottomNav
        role={role}
        coachApproved={coachApproved}
        organizationApproved={organizationApproved}
      />
    </>
  );
}
