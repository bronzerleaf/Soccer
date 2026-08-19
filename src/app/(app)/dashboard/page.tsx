import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { signOut } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userData.user.id)
    .single();

  let roleCopy = "Add a player profile, verify parental consent, then flag them open to opportunities so coaches can find them.";

  if (profile?.role === "coach") {
    const { data: verification } = await supabase
      .from("coach_verifications")
      .select("status")
      .eq("coach_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    roleCopy =
      verification?.status === "approved"
        ? "You're verified. You can now search players and message families about open roster spots."
        : verification?.status === "pending"
          ? "Your club verification is under review."
          : "Verify your club affiliation to start searching the player pool and messaging families.";
  } else if (profile?.role === "organization") {
    const { data: verification } = await supabase
      .from("organization_verifications")
      .select("status")
      .eq("organization_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    roleCopy =
      verification?.status === "approved"
        ? "You're verified. You can now post tournament and event listings to the local feed."
        : verification?.status === "pending"
          ? "Your organization verification is under review."
          : "Verify your organization to start posting tournament and event listings to the local feed.";
  } else if (profile?.role === "admin") {
    roleCopy = "Review coach verifications, flagged messages, roster posts, and the club list.";
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PlayerAvatar name={profile?.full_name || userData.user.email || "?"} size={44} />
          <div>
            <p className="text-sm text-slate-500">Signed in as</p>
            <p className="text-base font-semibold text-slate-900">
              {profile?.full_name || userData.user.email}
            </p>
          </div>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="secondary" size="sm">
            Log out
          </Button>
        </form>
      </div>

      <Card className="mt-10 p-5">
        <p className="text-sm font-medium text-slate-900">
          {profile?.role === "coach"
            ? "Coach account"
            : profile?.role === "admin"
              ? "Admin account"
              : profile?.role === "organization"
                ? "Organization account"
                : "Parent account"}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{roleCopy}</p>
        {profile?.role === "coach" ? (
          <Link
            href="/teams"
            className="mt-4 inline-block text-sm font-medium text-slate-700 underline"
          >
            Claim or manage a team
          </Link>
        ) : null}
        {profile?.role === "parent" ? (
          <Link
            href="/teams"
            className="mt-4 inline-block text-sm font-medium text-slate-700 underline"
          >
            Browse teams and message a coach
          </Link>
        ) : null}
      </Card>
    </main>
  );
}
