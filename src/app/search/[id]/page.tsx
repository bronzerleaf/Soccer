import Link from "next/link";
import { notFound } from "next/navigation";
import { requireVerifiedCoach } from "@/lib/coach";
import { startConversationWithParent } from "@/app/messages/actions";

export default async function SearchPlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireVerifiedCoach();

  const { data: player } = await supabase
    .from("players")
    .select(
      "id, first_name, last_initial, birth_year, positions, preferred_foot, city, bio, video_links, photo_url, current_club:clubs(name, city)"
    )
    .eq("id", id)
    .single();

  // A missing row here means either it doesn't exist or this coach isn't
  // allowed to see it (not open, not consented) — RLS already made that
  // decision; there's nothing more specific to say than "not found."
  if (!player) {
    notFound();
  }

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

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link href="/search" className="text-sm text-slate-500 underline">
        ← Back to search
      </Link>

      <div className="mt-6 flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {player.first_name} {player.last_initial}.
          </h1>
          <p className="text-sm text-slate-500">
            {player.birth_year} · {player.city}
          </p>
        </div>
      </div>

      <dl className="mt-8 space-y-4">
        <div>
          <dt className="text-sm font-medium text-slate-900">Position(s)</dt>
          <dd className="mt-1 text-sm text-slate-600">
            {(player.positions ?? []).join(", ") || "Not specified"}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-900">
            Preferred foot
          </dt>
          <dd className="mt-1 text-sm capitalize text-slate-600">
            {player.preferred_foot ?? "Not specified"}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-900">
            Current club/team
          </dt>
          <dd className="mt-1 text-sm text-slate-600">
            {club ? `${club.name} — ${club.city}` : "Not listed"}
          </dd>
        </div>
        {player.bio ? (
          <div>
            <dt className="text-sm font-medium text-slate-900">Bio</dt>
            <dd className="mt-1 text-sm leading-6 text-slate-600">
              {player.bio}
            </dd>
          </div>
        ) : null}
        {player.video_links && player.video_links.length > 0 ? (
          <div>
            <dt className="text-sm font-medium text-slate-900">
              Video links
            </dt>
            <dd className="mt-1 space-y-1">
              {player.video_links.map((link: string) => (
                <a
                  key={link}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-slate-700 underline"
                >
                  {link}
                </a>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="text-sm font-medium text-slate-900">
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
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 self-start rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
