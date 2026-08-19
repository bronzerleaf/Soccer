import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ComposerForm } from "./composer-form";

const FAMILY_TYPES = new Set(["looking_for_team", "guest_play"]);
const COACH_TYPES = new Set(["guest_play", "training"]);

const TITLE: Record<string, string> = {
  looking_for_team: "Looking for a team",
  guest_play: "Guest play",
  org_event: "Post a tournament or event",
  training: "Post a training or event",
};

export default async function NewFeedPostPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
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

  // "guest_play" is shared by two different flows -- a parent offering
  // their own player, or a verified coach saying their team needs one.
  // Which one applies is decided here, before anything else runs.
  let mode: "parent" | "coach" | "org";

  if (type === "org_event") {
    if (profile?.role !== "organization") {
      redirect("/feed");
    }
    const { data: verification } = await supabase
      .from("organization_verifications")
      .select("status")
      .eq("organization_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (verification?.status !== "approved") {
      redirect("/organization/verify");
    }
    mode = "org";
  } else if (type === "training") {
    if (profile?.role !== "coach") {
      redirect("/feed");
    }
    mode = "coach";
  } else if (type === "guest_play" && profile?.role === "coach") {
    mode = "coach";
  } else if (FAMILY_TYPES.has(type) && profile?.role === "parent") {
    mode = "parent";
  } else if (!FAMILY_TYPES.has(type) && !COACH_TYPES.has(type)) {
    notFound();
  } else {
    redirect("/feed");
  }

  // A coach post is gated on approved club verification the same way
  // roster spots and player search already are.
  if (mode === "coach") {
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
  }

  const { data: cities } = await supabase
    .from("cities")
    .select("id, name")
    .order("name");

  let players: { id: string; first_name: string; last_initial: string; birth_year: number }[] = [];
  if (mode === "parent") {
    const { data } = await supabase
      .from("players")
      .select("id, first_name, last_initial, birth_year")
      .eq("parent_id", userData.user.id)
      .eq("consent_completed", true)
      .order("first_name");
    players = data ?? [];
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-12">
      <Link href="/feed/new" className="text-sm text-slate-500 underline">
        ← Back
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-slate-900">
        {TITLE[type]}
      </h1>

      {mode === "parent" && players.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-4 text-center">
          <p className="text-sm text-slate-600">
            You don&rsquo;t have any consent-verified players yet.
          </p>
          <Link
            href="/players"
            className="mt-3 inline-block rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Go to your players
          </Link>
        </div>
      ) : (
        <div className="mt-6">
          <ComposerForm
            mode={mode}
            postType={type as "looking_for_team" | "guest_play" | "org_event" | "training"}
            cities={cities ?? []}
            players={players}
          />
        </div>
      )}
    </main>
  );
}
