import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { POSITIONS } from "@/app/(app)/players/constants";

const currentYear = new Date().getFullYear();
const BIRTH_YEARS = Array.from(
  { length: currentYear - 4 - (currentYear - 19) + 1 },
  (_, i) => currentYear - 19 + i
);

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function RosterPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const params = await searchParams;
  const birthYear = typeof params.birth_year === "string" ? params.birth_year : "";
  const city = typeof params.city === "string" ? params.city.trim() : "";
  const positions = toArray(params.positions);

  let query = supabase
    .from("roster_posts")
    .select(
      "id, birth_year, positions, tryout_date, description, expires_at, club:clubs(name, city)"
    )
    .order("created_at", { ascending: false });

  if (birthYear) query = query.eq("birth_year", Number(birthYear));
  if (positions.length > 0) query = query.overlaps("positions", positions);

  const { data: allPosts } = await query;

  // Filtering by city means the club's city, a joined column — done here
  // rather than chained into the query, since filtering on an embedded
  // resource has enough PostgREST edge cases that a plain in-memory
  // filter is the safer bet for a list this size.
  const posts = city
    ? (allPosts ?? []).filter((post) => {
        const club = post.club as unknown as { city: string } | null;
        return club?.city.toLowerCase().includes(city.toLowerCase());
      })
    : allPosts;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-xl font-semibold text-slate-900">
        Open roster spots
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Clubs looking to fill a spot for a specific age group.
      </p>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-4">
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
            className="mt-1.5 block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
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
            className="mt-1.5 block rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div className="w-full sm:w-auto">
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
        <div>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Search
          </button>
        </div>
      </form>

      {posts && posts.length > 0 ? (
        <ul className="mt-8 space-y-3">
          {posts.map((post) => {
            const club = post.club as unknown as {
              name: string;
              city: string;
            } | null;
            return (
              <li key={post.id}>
                <Link
                  href={`/roster-posts/${post.id}`}
                  className="block rounded-lg border border-slate-200 p-4 hover:border-slate-300"
                >
                  <p className="text-sm font-medium text-slate-900">
                    {club?.name} — {club?.city}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {post.birth_year} ·{" "}
                    {(post.positions ?? []).join(", ") || "Any position"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-slate-600">
          No open roster spots match these filters right now.
        </p>
      )}
    </main>
  );
}
