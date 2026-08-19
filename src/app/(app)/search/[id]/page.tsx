import Link from "next/link";
import { notFound } from "next/navigation";
import { requireVerifiedCoach } from "@/lib/coach";
import { startConversationWithParent } from "@/app/(app)/messages/actions";
import { fetchOEmbedPreview, type OEmbedPreview } from "@/lib/oembed/server";
import { LinkGallery, type Highlight } from "@/components/ui/link-gallery";
import { ActionButton } from "@/components/ui/action-button";
import { togglePlayerInterest } from "../actions";
import { levelLabel } from "@/app/(app)/players/constants";

export default async function SearchPlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, coachId } = await requireVerifiedCoach();

  const { data: player } = await supabase
    .from("players")
    .select(
      "id, first_name, last_initial, birth_year, positions, preferred_foot, city, bio, photo_url, instagram_url, youtube_url, years_experience, level_of_play, team_membership_verified, current_club:clubs(name, city), team:teams(id, name, leagues), player_highlights(id, url, caption, theme, show_in_feed)"
    )
    .eq("id", id)
    .single();

  if (!player) notFound();

  const { data: interest } = await supabase
    .from("player_interest")
    .select("player_id")
    .eq("player_id", id)
    .eq("coach_id", coachId)
    .maybeSingle();
  const hasMarkedInterest = !!interest;

  let photoUrl: string | null = null;
  if (player.photo_url) {
    const { data } = await supabase.storage.from("player-photos").createSignedUrl(player.photo_url, 3600);
    photoUrl = data?.signedUrl ?? null;
  }

  const club = player.current_club as unknown as { name: string; city: string } | null;
  const team = player.team as unknown as { id: string; name: string; leagues: string[] } | null;
  const highlights: Highlight[] = player.player_highlights ?? [];
  const previewList = await Promise.all(highlights.map((highlight) => fetchOEmbedPreview(highlight.url)));
  const previews: Record<string, OEmbedPreview | null> = {};
  highlights.forEach((highlight, i) => { previews[highlight.id] = previewList[i]; });
  const level = levelLabel(player.level_of_play);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-32 pt-5 sm:px-6">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/search" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold text-[#0b1736] shadow-sm" aria-label="Back to search">←</Link>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">Player profile</p>
          <p className="text-sm font-black text-[#0b1736]">PitchLink</p>
        </div>
        <div className="h-10 w-10" />
      </div>

      <section className="pitch-card overflow-hidden">
        <div className="h-20 bg-[linear-gradient(115deg,#0b1736_0%,#12345a_52%,#08a66c_150%)]" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end justify-between gap-3">
            <div className="relative h-24 w-24 overflow-hidden rounded-[28px] border-4 border-white bg-emerald-50 shadow-md">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-black text-emerald-700">{player.first_name.slice(0, 1)}</div>
              )}
              {player.team_membership_verified ? <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-xs font-black text-white">✓</span> : null}
            </div>
            {player.team_membership_verified ? (
              <span className="mb-1 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700">✓ Verified team player</span>
            ) : null}
          </div>

          <div className="mt-4">
            <h1 className="text-2xl font-black tracking-tight text-[#0b1736]">{player.first_name} {player.last_initial}.</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">{team?.name ?? club?.name ?? "Team not listed"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(player.positions ?? []).map((position) => <span key={position} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{position}</span>)}
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{player.birth_year}</span>
              {player.preferred_foot ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-700">{player.preferred_foot} foot</span> : null}
              {level ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{level}</span> : null}
              {player.years_experience !== null ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{player.years_experience} yrs playing</span> : null}
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{player.city}</span>
            </div>
            {team?.leagues?.length ? <p className="mt-3 text-xs font-semibold text-slate-400">{team.leagues.join(" · ")}</p> : null}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="[&>form]:h-full [&_button]:h-full [&_button]:w-full [&_button]:rounded-xl [&_button]:px-3 [&_button]:py-3 [&_button]:text-sm [&_button]:font-black">
              <ActionButton
                action={togglePlayerInterest.bind(null, player.id)}
                label={hasMarkedInterest ? "★ Interested" : "☆ Mark interest"}
                pendingLabel="Saving..."
                successMessage={hasMarkedInterest ? "Removed from your interest list" : "Marked as interested"}
                variant={hasMarkedInterest ? "primary" : "secondary"}
                size="sm"
              />
            </div>
            <a href="#message-family" className="flex items-center justify-center rounded-xl bg-[#0b1736] px-3 py-3 text-sm font-black text-white shadow-sm">Message family</a>
          </div>
        </div>
      </section>

      {player.bio ? (
        <section className="pitch-card mt-4 p-5">
          <div className="text-3xl font-black leading-none text-emerald-500">“</div>
          <p className="mt-1 text-sm leading-6 text-slate-700">{player.bio}</p>
          <p className="mt-3 text-xs font-black text-emerald-600">Managed by the player&rsquo;s family</p>
        </section>
      ) : null}

      {highlights.length > 0 ? (
        <section className="pitch-card mt-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-[#0b1736]">Clips</h2>
              <p className="mt-0.5 text-xs text-slate-500">External soccer video links selected by the family</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{highlights.length}</span>
          </div>
          <div className="mt-4"><LinkGallery highlights={highlights} previews={previews} /></div>
        </section>
      ) : null}

      {player.instagram_url || player.youtube_url ? (
        <section className="pitch-card mt-4 p-5">
          <h2 className="text-base font-black text-[#0b1736]">Links</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {player.instagram_url ? <a href={player.instagram_url} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black text-slate-700">Instagram ↗</a> : null}
            {player.youtube_url ? <a href={player.youtube_url} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black text-slate-700">YouTube ↗</a> : null}
          </div>
        </section>
      ) : null}

      <section id="message-family" className="pitch-card mt-4 scroll-mt-6 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg">✉</div>
          <div>
            <h2 className="text-base font-black text-[#0b1736]">Message the family</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Every conversation goes to the adult account that manages this profile.</p>
          </div>
        </div>
        <form action={startConversationWithParent.bind(null, player.id)} className="mt-4">
          <textarea name="body" rows={4} required placeholder="Introduce yourself, your team, and the opportunity..." className="block w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:bg-white" />
          <button type="submit" className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-emerald-700">Send message</button>
        </form>
      </section>
    </main>
  );
}
