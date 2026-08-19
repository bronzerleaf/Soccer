import Link from "next/link";
import { notFound } from "next/navigation";
import { requireVerifiedCoach } from "@/lib/coach";
import { startConversationWithParent } from "@/app/(app)/messages/actions";
import { fetchOEmbedPreview, type OEmbedPreview } from "@/lib/oembed/server";
import { LinkGallery, type Highlight } from "@/components/ui/link-gallery";
import { ActionButton } from "@/components/ui/action-button";
import { togglePlayerInterest } from "../actions";
import { Badge, VerifiedMark } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { InfoTile, InfoTileRow } from "@/components/ui/info-tile";

export default async function SearchPlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, coachId } = await requireVerifiedCoach();

  const { data: player } = await supabase
    .from("players")
    .select(
      "id, first_name, last_initial, birth_year, positions, preferred_foot, city, bio, photo_url, instagram_url, youtube_url, current_club:clubs(name, city), player_highlights(id, url, caption, theme)"
    )
    .eq("id", id)
    .single();

  // A missing row here means either it doesn't exist or this coach isn't
  // allowed to see it (not open, not consented) — RLS already made that
  // decision; there's nothing more specific to say than "not found."
  if (!player) {
    notFound();
  }

  const { data: interest } = await supabase
    .from("player_interest")
    .select("player_id")
    .eq("player_id", id)
    .eq("coach_id", coachId)
    .maybeSingle();
  const hasMarkedInterest = !!interest;

  let photoUrl: string | null = null;
  if (player.photo_url) {
    const { data } = await supabase.storage
      .from("player-photos")
      .createSignedUrl(player.photo_url, 3600);
    photoUrl = data?.signedUrl ?? null;
  }

  const club = player.current_club as unknown as {
    name: string;
    city: string;
  } | null;

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
      <Link href="/search" className="text-sm text-slate-500 underline">
        ← Back to search
      </Link>

      <Card className="mt-4">
        <div className="flex items-center gap-4">
          <PlayerAvatar name={player.first_name} photoUrl={photoUrl} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-lg font-semibold text-slate-900">
                {player.first_name} {player.last_initial}.
              </h1>
              <VerifiedMark />
            </div>
            <p className="text-sm text-slate-500">
              {club ? `${club.name} · ${club.city}` : player.city}
            </p>
          </div>
        </div>

        <div className="mt-2">
          <Badge tone="verified">Open to opportunities</Badge>
        </div>

        {(player.positions ?? []).length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(player.positions ?? []).map((position: string) => (
              <Badge key={position} tone="neutral">
                {position}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="mt-4">
          <InfoTileRow>
            <InfoTile value={player.birth_year} label="Birth year" />
            <InfoTile value={player.preferred_foot ? capitalize(player.preferred_foot) : "—"} label="Preferred foot" />
            <InfoTile value={player.city ?? "—"} label="City" />
          </InfoTileRow>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton
            action={togglePlayerInterest.bind(null, player.id)}
            label={hasMarkedInterest ? "Marked as interested" : "Mark as interested"}
            pendingLabel="Saving..."
            successMessage={hasMarkedInterest ? "Removed from your interest list" : "Marked as interested"}
            variant={hasMarkedInterest ? "primary" : "secondary"}
            size="sm"
            className="rounded-full"
          />
          {player.instagram_url ? (
            <a
              href={player.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400"
            >
              Instagram ↗
            </a>
          ) : null}
          {player.youtube_url ? (
            <a
              href={player.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400"
            >
              YouTube ↗
            </a>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Visible only to {player.first_name}&rsquo;s family — a lightweight
          way to flag interest alongside messaging them directly.
        </p>
      </Card>

      {player.bio ? (
        <Card className="mt-4">
          <p className="text-sm italic leading-6 text-slate-700">
            &ldquo;{player.bio}&rdquo;
          </p>
          <p className="mt-2 text-xs font-medium text-slate-500">
            — {player.first_name}
          </p>
        </Card>
      ) : null}

      {highlights.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-900">Highlights</h2>
          <div className="mt-2">
            <LinkGallery highlights={highlights} previews={previews} />
          </div>
        </div>
      ) : null}

      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-slate-900">
          Message the family
        </h2>
        <form
          action={startConversationWithParent.bind(null, player.id)}
          className="mt-3 flex gap-2"
        >
          <textarea
            name="body"
            rows={2}
            required
            placeholder={`Introduce yourself and the opportunity at your club...`}
            className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 self-start rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Send
          </button>
        </form>
      </Card>
    </main>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
