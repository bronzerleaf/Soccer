import Link from "next/link";
import { requireVerifiedCoach } from "@/lib/coach";
import { POSITIONS } from "@/app/players/constants";

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
      <h1 className="text-xl font-semibold text-slate-900">
        Search players
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Only players whose families have flagged them open to
        opportunities appear here.
      </p>

      <form method="get" className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="birth_year"
            className="block text-sm font-medium text-slate-900"
          >
            Birth year
          </label>
          <select
            id="birth_year"
            name="birth_year"
            defaultValue={birthYear}
            className="mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
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
            className="block text-sm font-medium text-slate-900"
          >
            City
          </label>
          <input
            id="city"
            name="city"
            type="text"
            defaultValue={city}
            className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <span className="block text-sm font-medium text-slate-900">
            Position
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {POSITIONS.map((position) => (
              <label
                key={position}
                className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
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
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
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
                <Link
                  href={`/search/${player.id}`}
                  className="flex items-center gap-4 rounded-lg border border-slate-200 p-4 hover:border-slate-300"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {player.first_name} {player.last_initial}. ·{" "}
                      {player.birth_year}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {(player.positions ?? []).join(", ") || "Position not set"}
                      {" · "}
                      {player.city}
                      {club ? ` · ${club.name}` : ""}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-slate-600">
          No players match these filters yet.
        </p>
      )}
    </main>
  );
}
