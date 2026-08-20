import { requireVerifiedCoach } from "@/lib/coach";
import { POSITIONS } from "@/app/(app)/players/constants";
import { Badge, VerifiedMark } from "@/components/ui/badge";
import { CardLink } from "@/components/ui/card";
import { PlayerAvatar } from "@/components/ui/player-avatar";

const currentYear = new Date().getFullYear();
const BIRTH_YEARS = Array.from(
  { length: currentYear - 4 - (currentYear - 19) + 1 },
  (_, i) => currentYear - 19 + i
);

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase } = await requireVerifiedCoach();
  const params = await searchParams;

  const birthYear = typeof params.birth_year === "string" ? params.birth_year : "";
  const positions = toArray(params.positions);
  const city = typeof params.city === "string" ? params.city.trim() : "";

  let query = supabase
    .from("players")
    .select(
      "id, first_name, last_initial, birth_year, positions, preferred_foot, city, photo_url, current_club:clubs(name, city)"
    )
    .order("created_at", { ascending: false });

  if (birthYear) query = query.eq("birth_year", Number(birthYear));
  if (positions.length > 0) query = query.overlaps("positions", positions);
  if (city) query = query.ilike("city", `%${city}%`);

  const { data: players } = await query;

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
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-xl font-semibold text-gray-900">
        Search players
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Only players whose families have flagged them open to
        opportunities appear here.
      </p>

      <form method="get" className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="birth_year"
            className="block text-sm font-medium text-gray-900"
          >
            Birth year
          </label>
          <select
            id="birth_year"
            name="birth_year"
            defaultValue={birthYear}
            className="mt-1.5 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
          >
            <option value="">Any</option>
            {BIRTH_YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="city"
            className="block text-sm font-medium text-gray-900"
          >
            City
          </label>
          <input
            id="city"
            name="city"
            type="text"
            defaultValue={city}
            className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <span className="block text-sm font-medium text-gray-900">
            Position
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {POSITIONS.map((position) => (
              <label
                key={position}
                className="flex items-center gap-1.5 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700"
              >
                <input
                  type="checkbox"
                  name="positions"
                  value={position}
                  defaultChecked={positions.includes(position)}
                  className="h-3.5 w-3.5"
                />
                {position}
              </label>
            ))}
          </div>
        </div>

        <div className="col-span-2 sm:col-span-3">
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Search
          </button>
        </div>
      </form>

      {players && players.length > 0 ? (
        <ul className="mt-8 space-y-3">
          {players.map((player) => {
            const club = player.current_club as unknown as {
              name: string;
              city: string;
            } | null;
            const photoUrl = player.photo_url
              ? signedUrlByPath.get(player.photo_url)
              : null;

            return (
              <li key={player.id}>
                <CardLink href={`/search/${player.id}`} className="flex items-center gap-4">
                  <PlayerAvatar name={player.first_name} photoUrl={photoUrl} size={56} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {player.first_name} {player.last_initial}. ·{" "}
                        {player.birth_year}
                      </p>
                      <VerifiedMark />
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {player.city}
                      {club ? ` · ${club.name}` : ""}
                    </p>
                    {player.positions && player.positions.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {player.positions.map((position: string) => (
                          <Badge key={position} tone="neutral">
                            {position}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </CardLink>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-gray-600">
          No players match these filters yet.
        </p>
      )}
    </main>
  );
}
