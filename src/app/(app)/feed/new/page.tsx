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

  if (profile?.role !== "parent") {
    redirect("/feed");
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-12">
      <Link href="/feed" className="text-sm text-slate-500 underline">
        ← Back to feed
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-slate-900">
        Post to the local feed
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        What are you looking for?
      </p>

      <div className="mt-6 space-y-3">
        <Link
          href="/feed/new/looking_for_team"
          className="block rounded-lg border border-slate-200 p-4 hover:border-slate-300"
        >
          <p className="text-sm font-medium text-slate-900">
            Looking for a team
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Your player is open to joining a new club team.
          </p>
        </Link>
        <Link
          href="/feed/new/guest_play"
          className="block rounded-lg border border-slate-200 p-4 hover:border-slate-300"
        >
          <p className="text-sm font-medium text-slate-900">Guest play</p>
          <p className="mt-1 text-sm text-slate-600">
            Your player is available for a one-off guest appearance.
          </p>
        </Link>
      </div>
    </main>
  );
}
