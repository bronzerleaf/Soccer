import Link from "next/link";
import { requireVerifiedCoach } from "@/lib/coach";
import { POSITIONS, PLAYER_LEVEL_LABELS } from "@/app/(app)/players/constants";
import { Badge, VerifiedMark } from "@/components/ui/badge";
import { CardLink } from "@/components/ui/card";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { FilterChip } from "@/components/pitchlink/filter-chip";

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
      "id, first_name, last_initial, birth_year, positions, years_playing, player_level, preferred_foot, city, photo_url, current_club:clubs(name, city), team:teams(id, name)"
    )
    .order("created_at", { ascending: false });

  if (birthYear) query = query.eq("birth_year", Number(birthYear));
  if (positions.length > 0) query = query.overlaps("positions", positions);
  if (city) query = query.ilike("city", `%${city}%`);

  const { data: players } = await query;

  const activeFilterCount =
    (birthYear ? 1 : 0) + (city ? 1 : 0) + (positions.length > 0 ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  // Preserves every other active param when removing just one filter
  // value — used to build each chip's "×" link below.
  function withoutFilter(kind: "birth_year" | "city" | "position", value?: string): string {
    const next = new URLSearchParams();
    if (kind !== "birth_year" && birthYear) next.set("birth_year", birthYear);
    if (kind !== "city" && city) next.set("city", city);
    if (kind !== "position") {
      for (const p of positions) if (p !== value) next.append("positions", p);
    }
    const qs = next.toString();
    return qs ? `/search?${qs}` : "/search";
  }

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

      <form method="get" className="mt-6">
        <div className="flex items-center gap-3">
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400 [&::-webkit-details-marker]:hidden">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              Filters
              {activeFilterCount > 0 ? (
                <span className="rounded-full bg-gray-900 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </summary>

            <div className="absolute z-10 mt-2 w-[min(90vw,20rem)] space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
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

              <div>
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

              <button
                type="submit"
                className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Apply filters
              </button>
            </div>
          </details>

          {hasActiveFilters ? (
            <Link href="/search" className="text-xs font-medium text-gray-500 underline">
              Clear all
            </Link>
          ) : null}
        </div>

        {activeFilterCount > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {birthYear ? (
              <FilterChip href={withoutFilter("birth_year")}>{birthYear}</FilterChip>
            ) : null}
            {city ? <FilterChip href={withoutFilter("city")}>{city}</FilterChip> : null}
            {positions.map((position) => (
              <FilterChip key={position} href={withoutFilter("position", position)}>
                {position}
              </FilterChip>
            ))}
          </div>
        ) : null}
      </form>

      {players && players.length > 0 ? (
        <ul className="mt-8 space-y-3">
          {players.map((player) => {
            const club = player.current_club as unknown as {
              name: string;
              city: string;
            } | null;
            const team = player.team as unknown as { id: string; name: string } | null;
            const photoUrl = player.photo_url
              ? signedUrlByPath.get(player.photo_url)
              : null;
            const levelLabel = player.player_level
              ? PLAYER_LEVEL_LABELS[player.player_level] ?? player.player_level
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
                      {club ? club.name : player.city}
                      {team ? ` · ${team.name}` : ""}
                      {!team && club ? ` · ${club.city}` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {[player.city, levelLabel].filter(Boolean).join(" · ")}
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
