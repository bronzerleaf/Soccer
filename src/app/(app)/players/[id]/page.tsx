import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deletePlayer, setSearchable } from "../actions";
import { ActionButton } from "@/components/ui/action-button";
import { PhotoUpload } from "./photo-upload";
import { EditPlayerForm } from "./edit-player-form";
import { DeletePlayerButton } from "./delete-player-button";
import { fetchOEmbedPreview, type OEmbedPreview } from "@/lib/oembed/server";
import { HighlightsManager } from "./highlights-manager";
import type { Highlight } from "@/components/ui/link-gallery";
import { levelLabel } from "../constants";

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const [{ data: player }, { data: clubs }, { data: teams }] = await Promise.all([
    supabase
      .from("players")
      .select(
        "id, parent_id, first_name, last_initial, birth_year, positions, preferred_foot, current_club_id, city, bio, photo_url, open_to_opportunities, consent_completed, team_id, team_membership_verified, instagram_url, youtube_url, years_experience, level_of_play, team:teams(name), player_highlights(id, url, caption, theme, show_in_feed)"
      )
      .eq("id", id)
      .single(),
    supabase.from("clubs").select("id, name, city").order("name"),
    supabase.from("teams").select("id, name").is("merged_into_team_id", null).order("name"),
  ]);

  if (!player) notFound();

  const { data: interestRows } = await supabase
    .from("player_interest")
    .select("coach_id, created_at, coach:profiles(full_name)")
    .eq("player_id", player.id)
    .order("created_at", { ascending: false });
  const interestedCoaches = (interestRows ?? []).map(
    (row) => (row.coach as unknown as { full_name: string } | null)?.full_name ?? "A coach"
  );

  type Teammate = { id: string; first_name: string; last_initial: string; birth_year: number; positions: string[] };
  let teammates: Teammate[] = [];
  if (player.team_id && player.team_membership_verified) {
    const { data: rosterRows } = await supabase.rpc("get_team_roster", { target_team_id: player.team_id });
    teammates = ((rosterRows ?? []) as Teammate[]).filter((row) => row.id !== player.id);
  }

  let signedPhotoUrl: string | null = null;
  if (player.photo_url) {
    const { data } = await supabase.storage.from("player-photos").createSignedUrl(player.photo_url, 3600);
    signedPhotoUrl = data?.signedUrl ?? null;
  }

  const highlights: Highlight[] = player.player_highlights ?? [];
  const previewList = await Promise.all(highlights.map((highlight) => fetchOEmbedPreview(highlight.url)));
  const previews: Record<string, OEmbedPreview | null> = {};
  highlights.forEach((highlight, i) => { previews[highlight.id] = previewList[i]; });

  const level = levelLabel(player.level_of_play);

  return (
    <main className="mx-auto max-w-lg px-4 pb-32 pt-7 sm:px-6">
      <Link href="/players" className="text-sm font-semibold text-slate-500">← Your players</Link>

      <div className="mt-5 flex items-center gap-4">
        <div className="shrink-0">
          <PhotoUpload playerId={player.id} parentId={player.parent_id} currentPhotoUrl={signedPhotoUrl} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">Player profile</p>
          <h1 className="truncate text-2xl font-black text-[#0b1736]">{player.first_name} {player.last_initial}.</h1>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {(player.positions ?? []).join(" · ") || "Positions not set"} · {player.birth_year}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {[level, player.years_experience !== null ? `${player.years_experience} yrs playing` : null, player.city].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <section className="pitch-card mt-6 p-5">
        {player.consent_completed ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-[#0b1736]">Allow verified professionals to find this profile</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                This is a private search setting. PitchLink does not show an “available” or “open” badge on the player profile.
              </p>
            </div>
            <ActionButton
              action={setSearchable.bind(null, player.id, !player.open_to_opportunities)}
              label={player.open_to_opportunities ? "On" : "Off"}
              pendingLabel="Saving..."
              successMessage={player.open_to_opportunities ? "Search visibility off" : "Search visibility on"}
              variant={player.open_to_opportunities ? "primary" : "secondary"}
              size="sm"
            />
          </div>
        ) : (
          <div>
            <p className="text-sm font-black text-[#0b1736]">Complete parental consent first</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Search visibility and feed publishing stay disabled until parental consent is verified.
            </p>
            <Link href={`/players/${player.id}/consent`} className="mt-3 inline-block rounded-xl bg-[#0b1736] px-4 py-2 text-sm font-bold text-white">Verify now</Link>
          </div>
        )}
      </section>

      {player.instagram_url || player.youtube_url ? (
        <div className="mt-4 flex gap-2">
          {player.instagram_url ? <a href={player.instagram_url} target="_blank" rel="noopener noreferrer" className="pitch-pill px-3 py-2 text-xs font-bold text-slate-700">Instagram ↗</a> : null}
          {player.youtube_url ? <a href={player.youtube_url} target="_blank" rel="noopener noreferrer" className="pitch-pill px-3 py-2 text-xs font-bold text-slate-700">YouTube ↗</a> : null}
        </div>
      ) : null}

      {interestedCoaches.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm font-black text-emerald-900">Professional interest</p>
          <p className="mt-1 text-xs leading-5 text-emerald-800">
            {interestedCoaches.join(", ")} marked interest. This is visible to your family, not displayed on the player profile.
          </p>
        </section>
      ) : null}

      {player.team_id && !player.team_membership_verified ? (
        <section className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-sm font-black text-amber-900">Team membership pending</p>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            Once a verified team coach confirms membership, this player can appear to other verified families on the same team.
          </p>
        </section>
      ) : null}

      {teammates.length > 0 ? (
        <section className="mt-7">
          <h2 className="text-base font-black text-[#0b1736]">Verified teammates</h2>
          <p className="mt-1 text-xs text-slate-500">Other confirmed PitchLink players on {(player.team as unknown as { name: string } | null)?.name}.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {teammates.map((mate) => (
              <div key={mate.id} className="pitch-card p-3">
                <p className="text-sm font-black text-slate-900">{mate.first_name} {mate.last_initial}.</p>
                <p className="mt-1 text-xs text-slate-500">{mate.birth_year} · {(mate.positions ?? []).join(" · ") || "Position not listed"}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-black text-[#0b1736]">Clips</h2>
            <p className="mt-1 text-xs text-slate-500">Choose profile-only or profile + feed for every clip.</p>
          </div>
        </div>
        <div className="mt-3"><HighlightsManager playerId={player.id} highlights={highlights} previews={previews} /></div>
      </section>

      <section className="pitch-card mt-8 p-5">
        <details>
          <summary className="cursor-pointer list-none text-sm font-black text-[#0b1736]">Edit profile details</summary>
          <div className="mt-5">
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
                years_experience: player.years_experience,
                level_of_play: player.level_of_play,
              }}
            />
          </div>
        </details>
      </section>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <form action={deletePlayer.bind(null, player.id)}>
          <DeletePlayerButton firstName={player.first_name} />
        </form>
      </div>
    </main>
  );
}
