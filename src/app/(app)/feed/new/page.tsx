import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function NewFeedPostChooserPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();

  if (profile?.role === "organization") redirect("/feed/new/org_event");

  if (profile?.role === "trainer") {
    const { data: verification } = await supabase
      .from("trainer_verifications")
      .select("status")
      .eq("trainer_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (verification?.status !== "approved") redirect("/trainer/verify");
    redirect("/feed/new/training");
  }

  if (profile?.role === "coach") {
    const { data: verification } = await supabase
      .from("coach_verifications")
      .select("status")
      .eq("coach_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (verification?.status !== "approved") redirect("/coach/verify");

    return (
      <main className="mx-auto max-w-sm px-6 py-12">
        <Link href="/feed" className="text-sm font-semibold text-slate-500">← Back to feed</Link>
        <h1 className="mt-4 text-2xl font-black text-[#0b1736]">Create a post</h1>
        <p className="mt-2 text-sm text-slate-500">What does your team or club need?</p>
        <div className="mt-6 space-y-3">
          <PostChoice href="/roster-posts/new" title="Open roster spot" copy="Recruit for a specific age group or position." />
          <PostChoice href="/feed/new/guest_play" title="Need a guest player" copy="Find a player for an upcoming game or tournament." />
          <PostChoice href="/feed/new/training" title="Training / clinic" copy="Share a camp, clinic or training session." />
        </div>
      </main>
    );
  }

  if (profile?.role !== "parent") redirect("/feed");

  return (
    <main className="mx-auto max-w-sm px-6 py-12">
      <Link href="/feed" className="text-sm font-semibold text-slate-500">← Back to feed</Link>
      <h1 className="mt-4 text-2xl font-black text-[#0b1736]">Create a post</h1>
      <p className="mt-2 text-sm text-slate-500">Share a specific need without changing the player&rsquo;s private search setting.</p>
      <div className="mt-6 space-y-3">
        <PostChoice href="/feed/new/looking_for_team" title="Looking for a team" copy="Tell the community what kind of team you are looking for." />
        <PostChoice href="/feed/new/guest_play" title="Available for guest play" copy="Share availability for a specific guest-play opportunity." />
        <PostChoice href="/players" title="Post a player clip" copy="Open the player profile, add a clip and choose Profile + feed." />
      </div>
    </main>
  );
}

function PostChoice({ href, title, copy }: { href: string; title: string; copy: string }) {
  return (
    <Link href={href} className="pitch-card block p-4 transition-transform active:scale-[0.99]">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-sm font-black text-[#0b1736]">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{copy}</p></div>
        <span className="text-slate-300">→</span>
      </div>
    </Link>
  );
}
