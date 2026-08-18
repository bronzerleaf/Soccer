import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  let coachStatusCopy = "";
  let coachIsApproved = false;
  if (profile?.role === "coach") {
    const { data: verification } = await supabase
      .from("coach_verifications")
      .select("status")
      .eq("coach_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    coachIsApproved = verification?.status === "approved";
    coachStatusCopy = coachIsApproved
      ? "You're verified. You can now search players and message families about open roster spots."
      : verification?.status === "pending"
        ? "Your club verification is under review."
        : "Verify your club affiliation to start searching the player pool and messaging families.";
  }

  const roleCopy =
    profile?.role === "coach"
      ? coachStatusCopy
      : profile?.role === "admin"
        ? "Review coach verifications, flagged messages, roster posts, and the club list."
        : "Add a player profile, verify parental consent, then flag them open to opportunities so coaches can find them.";

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Signed in as</p>
          <p className="text-base font-semibold text-slate-900">
            {profile?.full_name || userData.user.email}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
          >
            Log out
          </button>
        </form>
      </div>

      <div className="mt-10 rounded-lg border border-slate-200 p-5">
        <p className="text-sm font-medium text-slate-900">
          {profile?.role === "coach"
            ? "Coach account"
            : profile?.role === "admin"
              ? "Admin account"
              : "Parent account"}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{roleCopy}</p>
        {profile?.role === "parent" ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/players"
              className="inline-block rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Your players
            </Link>
            <Link
              href="/roster-posts"
              className="inline-block rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
            >
              Open roster spots
            </Link>
            <Link
              href="/messages"
              className="inline-block rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
            >
              Messages
            </Link>
          </div>
        ) : null}
        {profile?.role === "coach" ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {coachIsApproved ? (
              <>
                <Link
                  href="/search"
                  className="inline-block rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Search players
                </Link>
                <Link
                  href="/roster-posts/mine"
                  className="inline-block rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  Your roster posts
                </Link>
                <Link
                  href="/messages"
                  className="inline-block rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  Messages
                </Link>
              </>
            ) : null}
            <Link
              href="/coach/verify"
              className={
                coachIsApproved
                  ? "inline-block rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
                  : "inline-block rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
              }
            >
              Club verification
            </Link>
          </div>
        ) : null}
        {profile?.role === "admin" ? (
          <div className="mt-4">
            <Link
              href="/admin"
              className="inline-block rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Admin dashboard
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
