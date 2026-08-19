import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deletePlayer, setOpenToOpportunities } from "../actions";
import { ActionButton } from "@/components/ui/action-button";
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
        "id, parent_id, first_name, last_initial, birth_year, positions, preferred_foot, current_club_id, city, bio, photo_url, open_to_opportunities, consent_completed, team_id, team:teams(name), player_highlights(id, url, caption, theme)"
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

      <div className="mt-6">
        <PhotoUpload
          playerId={player.id}
          parentId={player.parent_id}
          currentPhotoUrl={signedPhotoUrl}
        />
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 p-5">
        {player.consent_completed ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {player.open_to_opportunities
                  ? "Open to opportunities"
                  : "Not currently open to opportunities"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {player.open_to_opportunities
                  ? "Verified coaches can find and message you about this player."
                  : "Turn this on when you're ready for coaches to find this profile."}
              </p>
            </div>
            <ActionButton
              action={setOpenToOpportunities.bind(
                null,
                player.id,
                !player.open_to_opportunities
              )}
              label={player.open_to_opportunities ? "Turn off" : "Turn on"}
              pendingLabel="Saving..."
              successMessage={
                player.open_to_opportunities
                  ? "Turned off"
                  : "Now open to opportunities"
              }
              variant="secondary"
              size="sm"
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
