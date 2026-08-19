import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, VerifiedMark } from "@/components/ui/badge";
import { CardLink } from "@/components/ui/card";
import { PlayerAvatar } from "@/components/ui/player-avatar";

export default async function PlayersPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: players } = await supabase
    .from("players")
    .select(
      "id, first_name, last_initial, birth_year, city, positions, photo_url, open_to_opportunities, consent_completed"
    )
    .order("created_at", { ascending: false });

  const photoPaths = (players ?? [])
    .map((p) => p.photo_url)
    .filter((p): p is string => Boolean(p));
  let signedUrlByPath = new Map<string, string>();
  if (photoPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("player-photos")
      .createSignedUrls(photoPaths, 3600);
    signedUrlByPath = new Map(
      (signed ?? [])
        .filter((s): s is typeof s & { signedUrl: string } => Boolean(s.signedUrl))
        .map((s) => [s.path ?? "", s.signedUrl])
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">
          Your players
        </h1>
        <Link
          href="/players/new"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Add a player
        </Link>
      </div>

      {players && players.length > 0 ? (
        <ul className="mt-8 space-y-3">
          {players.map((player) => (
            <li key={player.id}>
              <CardLink href={`/players/${player.id}`} className="flex items-center gap-3">
                <PlayerAvatar
                  name={player.first_name}
                  photoUrl={player.photo_url ? signedUrlByPath.get(player.photo_url) : undefined}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {player.first_name} {player.last_initial}. · {player.birth_year}
                    </p>
                    {player.consent_completed ? <VerifiedMark /> : null}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {(player.positions ?? []).join(", ") || "No position set"} · {player.city}
                  </p>
                  <Badge
                    className="mt-2"
                    tone={
                      !player.consent_completed
                        ? "pending"
                        : player.open_to_opportunities
                          ? "verified"
                          : "neutral"
                    }
                  >
                    {!player.consent_completed
                      ? "Needs verification"
                      : player.open_to_opportunities
                        ? "Open to opportunities"
                        : "Not open"}
                  </Badge>
                </div>
              </CardLink>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-6 text-center">
          <p className="text-sm font-medium text-slate-900">
            Add your first player
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Create a profile, verify parental consent, then flag them open
            to opportunities whenever you&rsquo;re ready for coaches to find
            them.
          </p>
          <Link
            href="/players/new"
            className="mt-4 inline-block rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Add a player
          </Link>
        </div>
      )}
    </main>
  );
}
