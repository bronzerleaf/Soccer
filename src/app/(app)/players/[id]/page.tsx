import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deletePlayer, setOpenToOpportunities } from "../actions";
import { ToggleActionButton } from "@/components/ui/action-button";
import { Badge, VerifiedMark } from "@/components/ui/badge";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { PhotoUpload } from "./photo-upload";
import { EditPlayerForm } from "./edit-player-form";
import { DeletePlayerButton } from "./delete-player-button";
import { fetchOEmbedPreview, type OEmbedPreview } from "@/lib/oembed/server";
import { HighlightsManager } from "./highlights-manager";
import type { Highlight } from "@/components/ui/link-gallery";

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const [{ data: player }, { data: clubs }, { data: teams }] = await Promise.all([
    supabase
      .from("players")
      .select(
        "id, parent_id, first_name, last_initial, birth_year, positions, preferred_foot, current_club_id, city, bio, photo_url, open_to_opportunities, consent_completed, team_id, team_membership_verified, instagram_url, youtube_url, team:teams(name), player_highlights(id, url, caption, theme)"
      )
      .eq("id", id)
      .single(),
    supabase.from("clubs").select("id, name, city").order("name"),
    supabase
      .from("teams")
      .select("id, name")
      .is("merged_into_team_id", null)
      .order("name"),
  ]);

  if (!player) {
    notFound();
  }

  // RLS already scopes this to the requesting parent's own player rows
  // ("player_interest: parent reads own player's interest") — no other
  // family's interest list is ever reachable this way.
  const { data: interestRows } = await supabase
    .from("player_interest")
    .select("coach_id, created_at, coach:profiles(full_name)")
    .eq("player_id", player.id)
    .order("created_at", { ascending: false });
  const interestedCoaches = (interestRows ?? []).map(
    (row) => (row.coach as unknown as { full_name: string } | null)?.full_name ?? "A coach"
  );

  // Only returns rows at all once this exact player is a *verified* team
  // member — get_team_roster() re-checks that itself, so this can't be
  // fooled by requesting it for a team this player isn't confirmed on.
  type Teammate = { id: string; first_name: string; last_initial: string; birth_year: number; positions: string[] };
  let teammates: Teammate[] = [];
  if (player.team_id && player.team_membership_verified) {
    const { data: rosterRows } = await supabase.rpc("get_team_roster", {
      target_team_id: player.team_id,
    });
    teammates = ((rosterRows ?? []) as Teammate[]).filter((row) => row.id !== player.id);
  }

  let signedPhotoUrl: string | null = null;
  if (player.photo_url) {
    const { data } = await supabase.storage
      .from("player-photos")
      .createSignedUrl(player.photo_url, 3600);
    signedPhotoUrl = data?.signedUrl ?? null;
  }

  const highlights: Highlight[] = player.player_highlights ?? [];
  const previewList = await Promise.all(
    highlights.map((highlight) => fetchOEmbedPreview(highlight.url))
  );
  const previews: Record<string, OEmbedPreview | null> = {};
  highlights.forEach((highlight, i) => {
    previews[highlight.id] = previewList[i];
  });

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link href="/players" className="text-sm text-slate-500 underline">
        ← Back to your players
      </Link>

      <h1 className="mt-3 text-xl font-semibold text-slate-900">
        {player.first_name} {player.last_initial}.
      </h1>

      <div className="mt-4 flex items-center gap-3.5">
        <PhotoUpload
          playerId={player.id}
          parentId={player.parent_id}
          currentPhotoUrl={signedPhotoUrl}
        />
        <div className="flex flex-col gap-1.5">
          {player.team_membership_verified ? (
            <Badge tone="verified">
              <VerifiedMark />
              Verified Team Member
            </Badge>
          ) : null}
          {player.team ? (
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-md bg-slate-900" aria-hidden="true" />
              <span className="text-sm font-bold text-slate-900">
                {(player.team as unknown as { name: string }).name}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {(player.positions ?? []).map((position: string) => (
          <Badge key={position} tone="neutral">
            {position}
          </Badge>
        ))}
        <Badge tone="neutral">Birth Year {player.birth_year}</Badge>
        {player.preferred_foot ? (
          <Badge tone="neutral">Strong Foot: {player.preferred_foot}</Badge>
        ) : null}
        {player.city ? <Badge tone="neutral">{player.city}</Badge> : null}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {player.consent_completed ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-900">
                {player.open_to_opportunities
                  ? "Open to opportunities"
                  : "Not currently open to opportunities"}
              </p>
              <p className="mt-0.5 max-w-[220px] text-xs text-slate-500">
                {player.open_to_opportunities
                  ? "Verified coaches can find and message you about this player."
                  : "Turn this on when you're ready for coaches to find this profile."}
              </p>
            </div>
            <ToggleActionButton
              action={setOpenToOpportunities.bind(
                null,
                player.id,
                !player.open_to_opportunities
              )}
              active={player.open_to_opportunities}
              label={
                player.open_to_opportunities
                  ? "Turn off open to opportunities"
                  : "Turn on open to opportunities"
              }
            />
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-slate-900">
              Verify parental consent to activate this profile
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Until this is done, {player.first_name} won&rsquo;t be visible to
              any coach.
            </p>
            <Link
              href={`/players/${player.id}/consent`}
              className="mt-3 inline-block rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Verify now
            </Link>
          </div>
        )}
      </div>

      {interestedCoaches.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="text-sm font-bold text-slate-900">
            {interestedCoaches.length} coach
            {interestedCoaches.length === 1 ? "" : "es"} interested
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {interestedCoaches.join(", ")} marked interest in{" "}
            {player.first_name}&rsquo;s profile. Check your messages, or
            reach out from theirs.
          </p>
        </div>
      ) : null}

      {player.team_id && !player.team_membership_verified ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-amber-50 p-5">
          <p className="text-sm font-medium text-slate-900">
            Team membership pending
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {player.first_name}&rsquo;s team hasn&rsquo;t confirmed them yet.
            Once the team&rsquo;s coach verifies it, {player.first_name} will
            show up to their verified teammates&rsquo; families too.
          </p>
        </div>
      ) : null}

      {teammates.length > 0 ? (
        <div className="mt-5">
          <h2 className="text-sm font-bold text-slate-900">Teammates</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Other verified players on {(player.team as unknown as { name: string } | null)?.name}.
          </p>
          <ul className="mt-2.5 space-y-2">
            {teammates.map((mate) => (
              <li
                key={mate.id}
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
              >
                <PlayerAvatar name={mate.first_name} size={32} />
                <span className="flex-1 text-sm">
                  <span className="font-semibold text-slate-900">
                    {mate.first_name} {mate.last_initial}.
                  </span>{" "}
                  <span className="text-slate-400">
                    · {mate.birth_year} ·{" "}
                    {(mate.positions ?? []).join(", ") || "No position listed"}
                  </span>
                </span>
                <VerifiedMark />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8">
        <h2 className="text-sm font-medium text-slate-900">Highlights</h2>
        <div className="mt-2">
          <HighlightsManager
            playerId={player.id}
            highlights={highlights}
            previews={previews}
          />
        </div>
      </div>

      {player.instagram_url || player.youtube_url ? (
        <div className="mt-8 flex gap-2">
          {player.instagram_url ? (
            <a
              href={player.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-center text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              Instagram ↗
            </a>
          ) : null}
          {player.youtube_url ? (
            <a
              href={player.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-center text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              YouTube ↗
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8">
        <EditPlayerForm
          playerId={player.id}
          clubs={clubs ?? []}
          teams={teams ?? []}
          defaultValues={{
            first_name: player.first_name,
            last_initial: player.last_initial,
            birth_year: player.birth_year,
            positions: player.positions ?? [],
            preferred_foot: player.preferred_foot,
            current_club_id: player.current_club_id,
            city: player.city,
            bio: player.bio,
            team_name: (player.team as unknown as { name: string } | null)?.name ?? null,
            instagram_url: player.instagram_url,
            youtube_url: player.youtube_url,
          }}
        />
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <form action={deletePlayer.bind(null, player.id)}>
          <DeletePlayerButton firstName={player.first_name} />
        </form>
      </div>
    </main>
  );
}
