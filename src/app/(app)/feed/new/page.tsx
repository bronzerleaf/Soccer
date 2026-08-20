import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function NewFeedPostChooserPage() {
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

  if (profile?.role === "organization") {
    redirect("/feed/new/org_event");
  }

  if (profile?.role === "coach") {
    const { data: verification } = await supabase
      .from("coach_verifications")
      .select("status")
      .eq("coach_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (verification?.status !== "approved") {
      redirect("/coach/verify");
    }

    return (
      <main className="mx-auto max-w-sm px-6 py-12">
        <Link href="/feed" className="text-sm text-gray-500 underline">
          ← Back to feed
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-gray-900">
          Post to the local feed
        </h1>
        <p className="mt-2 text-sm text-gray-600">What are you posting?</p>

        <div className="mt-6 space-y-3">
          <Link
            href="/roster-posts/new"
            className="block rounded-lg border border-gray-200 p-4 hover:border-gray-300"
          >
            <p className="text-sm font-medium text-gray-900">Roster spot</p>
            <p className="mt-1 text-sm text-gray-600">
              Your club has an open spot for a specific age group.
            </p>
          </Link>
          <Link
            href="/feed/new/guest_play"
            className="block rounded-lg border border-gray-200 p-4 hover:border-gray-300"
          >
            <p className="text-sm font-medium text-gray-900">
              Need a guest player
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Your team needs a one-off guest for an upcoming game.
            </p>
          </Link>
          <Link
            href="/feed/new/training"
            className="block rounded-lg border border-gray-200 p-4 hover:border-gray-300"
          >
            <p className="text-sm font-medium text-gray-900">
              Training / event
            </p>
            <p className="mt-1 text-sm text-gray-600">
              A clinic, camp, or training session families can sign up for.
            </p>
          </Link>
        </div>
      </main>
    );
  }

  if (profile?.role !== "parent") {
    redirect("/feed");
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-12">
      <Link href="/feed" className="text-sm text-gray-500 underline">
        ← Back to feed
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-gray-900">
        Post to the local feed
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        What are you looking for?
      </p>

      <div className="mt-6 space-y-3">
        <Link
          href="/feed/new/looking_for_team"
          className="block rounded-lg border border-gray-200 p-4 hover:border-gray-300"
        >
          <p className="text-sm font-medium text-gray-900">
            Looking for a team
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Your player is open to joining a new club team.
          </p>
        </Link>
        <Link
          href="/feed/new/guest_play"
          className="block rounded-lg border border-gray-200 p-4 hover:border-gray-300"
        >
          <p className="text-sm font-medium text-gray-900">Guest play</p>
          <p className="mt-1 text-sm text-gray-600">
            Your player is available for a one-off guest appearance.
          </p>
        </Link>
      </div>
    </main>
  );
}
