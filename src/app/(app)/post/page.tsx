import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// The bottom nav's single "Post" tab. A coach/org has exactly one thing
// to post, so they skip straight to the existing /feed/new chooser
// (which already handles its own role/verification gating). A parent
// has two: a feed post, or a highlight clip -- and only a highlight can
// optionally also land in the feed, so that split happens here first.
export default async function PostEntryPage() {
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

  if (profile?.role !== "parent") {
    redirect("/feed/new");
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-12">
      <Link href="/feed" className="text-sm text-gray-500 underline">
        ← Back to feed
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-gray-900">Post</h1>
      <p className="mt-2 text-sm text-gray-600">What do you want to share?</p>

      <div className="mt-6 space-y-3">
        <Link
          href="/feed/new"
          className="block rounded-lg border border-gray-200 p-4 hover:border-gray-300"
        >
          <p className="text-sm font-medium text-gray-900">Feed post</p>
          <p className="mt-1 text-sm text-gray-600">
            Looking for a team, or your player&rsquo;s available for a
            guest game.
          </p>
        </Link>
        <Link
          href="/post/highlight"
          className="block rounded-lg border border-gray-200 p-4 hover:border-gray-300"
        >
          <p className="text-sm font-medium text-gray-900">Highlight clip</p>
          <p className="mt-1 text-sm text-gray-600">
            Add a video or photo link to a player&rsquo;s profile — and
            share it to the feed if you want.
          </p>
        </Link>
      </div>
    </main>
  );
}
