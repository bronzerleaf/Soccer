import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { signOut } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", userData.user.id).single();
  let roleCopy = "Create and edit player profiles, manage private professional-search visibility, and share clips or opportunities when you choose.";
  let primaryHref = "/players";
  let primaryLabel = "Manage players";

  if (profile?.role === "coach") {
    const { data: verification } = await supabase.from("coach_verifications").select("status").eq("coach_id", userData.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    roleCopy = verification?.status === "approved"
      ? "You're verified. Search discoverable player profiles, manage teams, publish opportunities and message families."
      : verification?.status === "pending" ? "Your coach verification is under review." : "Verify your soccer affiliation to unlock player discovery and messaging.";
    primaryHref = verification?.status === "approved" ? "/search" : "/coach/verify";
    primaryLabel = verification?.status === "approved" ? "Discover players" : "Coach verification";
  } else if (profile?.role === "trainer") {
    const { data: verification } = await supabase.from("trainer_verifications").select("status").eq("trainer_id", userData.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    roleCopy = verification?.status === "approved"
      ? "You're verified. Publish training sessions and connect with families who explicitly express interest."
      : verification?.status === "pending" ? "Your trainer verification is under review." : "Verify your soccer training background before publishing training opportunities.";
    primaryHref = verification?.status === "approved" ? "/feed/new/training" : "/trainer/verify";
    primaryLabel = verification?.status === "approved" ? "Post training" : "Trainer verification";
  } else if (profile?.role === "organization") {
    const { data: verification } = await supabase.from("organization_verifications").select("status").eq("organization_id", userData.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    roleCopy = verification?.status === "approved"
      ? "You're verified. Publish soccer events and connect with families who explicitly express interest."
      : verification?.status === "pending" ? "Your organization verification is under review." : "Verify your organization before publishing events.";
    primaryHref = verification?.status === "approved" ? "/feed/new/org_event" : "/organization/verify";
    primaryLabel = verification?.status === "approved" ? "Post event" : "Organization verification";
  } else if (profile?.role === "admin") {
    roleCopy = "Review coach, trainer, organization and team verification queues plus moderation activity.";
    primaryHref = "/admin";
    primaryLabel = "Open admin";
  }

  const accountLabel = profile?.role === "coach" ? "Coach" : profile?.role === "trainer" ? "Trainer" : profile?.role === "organization" ? "Organization" : profile?.role === "admin" ? "Admin" : "Parent";

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-32 pt-8 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">PitchLink</p>
          <h1 className="mt-1 text-2xl font-black text-[#0b1736]">{profile?.full_name || userData.user.email}</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">{accountLabel} account</p>
        </div>
        <form action={signOut}><Button type="submit" variant="secondary" size="sm">Log out</Button></form>
      </div>

      <section className="pitch-card mt-7 p-5">
        <p className="text-sm leading-6 text-slate-600">{roleCopy}</p>
        <Link href={primaryHref} className="mt-4 inline-flex rounded-xl bg-[#0b1736] px-4 py-2.5 text-sm font-black text-white">{primaryLabel}</Link>
        {profile?.role === "parent" ? <Link href="/teams" className="ml-3 mt-4 inline-flex text-sm font-bold text-emerald-700">Browse teams →</Link> : null}
        {profile?.role === "coach" ? <Link href="/teams" className="ml-3 mt-4 inline-flex text-sm font-bold text-emerald-700">Teams →</Link> : null}
      </section>
    </main>
  );
}
