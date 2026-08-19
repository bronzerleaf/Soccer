import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { haversineMiles } from "@/lib/geo";
import { LocationSettings } from "./location-settings";
import { FeedCard, type FeedItem } from "./feed-card";
import { POSITIONS } from "@/app/(app)/players/constants";

const currentYear = new Date().getFullYear();
const BIRTH_YEARS = Array.from(
  { length: currentYear - 4 - (currentYear - 19) + 1 },
  (_, i) => currentYear - 19 + i
);

const POST_TYPE_OPTIONS = [
  { value: "roster_spot", label: "Roster spot" },
  { value: "looking_for_team", label: "Looking for a team" },
  { value: "guest_play", label: "Guest play" },
  { value: "training", label: "Training / event" },
  { value: "org_event", label: "Tournament / event" },
] as const;

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

// org_event carries neither a birth year nor a position — it's an event
// listing, not a player-specific post — so it's exempt from both filters
// rather than being filtered out by fields it doesn't have. training does
// carry both (a coach can optionally set an age group/position), so it
// isn't exempted — a null value there already passes the filter as-is.
function itemBirthYear(item: FeedItem): number | null {
  return item.kind === "org_event" ? null : item.birthYear;
}
function itemPositions(item: FeedItem): string[] {
  return item.kind === "org_event" ? [] : item.positions;
}

// What the free-text search box matches against — the description plus
// whatever name/place fields the card itself shows, so a search never
// surfaces more than the card already displays.
function itemSearchText(item: FeedItem): string {
  const parts: string[] = [];
  if (item.kind === "roster_spot") {
    parts.push(item.clubName, item.clubCity);
  } else {
    parts.push(item.description);
    if (item.kind === "org_event") {
      parts.push(item.orgName, item.cityName);
    } else if (item.kind === "training") {
      parts.push(item.authorName, item.cityName);
    } else {
      parts.push(item.cityName);
      if (item.authorName) parts.push(item.authorName);
    }
  }
  return parts.join(" ").toLowerCase();
}

export default async function FeedPage({
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
  const birthYearFilter = typeof params.birth_year === "string" ? params.birth_year : "";
  const positionFilter = toArray(params.positions);
  const postTypeFilter = toArray(params.post_type);
  const searchQuery = typeof params.q === "string" ? params.q.trim() : "";

  const [{ data: profile }, { data: cities }] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, home_city_id, radius_miles")
      .eq("id", userData.user.id)
      .single(),
    supabase.from("cities").select("id, name, latitude, longitude").order("name"),
  ]);

  const cityList = cities ?? [];
  const cityById = new Map(cityList.map((c) => [c.id, c]));
  const homeCity = profile?.home_city_id ? cityById.get(profile.home_city_id) : null;
  const radiusMiles = profile?.radius_miles ?? null;

  // birth_year/positions/post_type are all applied in-memory below, after
  // the merged FeedItem list is built, rather than chained into either
  // query — org_event rows carry neither birth_year nor positions (so
  // they need to be exempted from those two filters, not matched against
  // them), and user-controlled filter values have no safe way to reach a
  // raw PostgREST filter string without risking injection. Data volumes
  // here are small enough that a plain in-memory filter is the safer bet,
  // same reasoning /roster-posts already documents for its city filter.
  const [{ data: rosterPosts }, { data: feedPosts }, { data: myLikes }] =
    await Promise.all([
      supabase
        .from("roster_posts")
        .select("id, birth_year, positions, created_at, club:clubs(name, city)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("feed_posts")
        .select(
          "id, post_type, author_id, city_id, player_id, birth_year, positions, description, cost_cents, duration_minutes, created_at, author:profiles(full_name)"
        )
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("feed_post_likes")
        .select("post_id")
        .eq("profile_id", userData.user.id),
    ]);

  const likedPostIds = new Set((myLikes ?? []).map((l) => l.post_id));

  // roster_posts don't carry a city_id (clubs use a free-text city field,
  // not the curated cities table), so they're never radius-filtered --
  // same as they already behave on the existing /roster-posts browse page.
  const rosterItems: FeedItem[] = (rosterPosts ?? []).map((post) => {
    const club = post.club as unknown as { name: string; city: string } | null;
    return {
      kind: "roster_spot",
      id: post.id,
      birthYear: post.birth_year,
      positions: post.positions ?? [],
      clubName: club?.name ?? "Unknown club",
      clubCity: club?.city ?? "",
      createdAt: post.created_at,
    };
  });

  const canFilterByRadius = !!(homeCity && radiusMiles);

  const feedItems: FeedItem[] = (feedPosts ?? [])
    .filter((post) => {
      if (!canFilterByRadius) return true;
      const postCity = cityById.get(post.city_id);
      if (!postCity || !homeCity) return true;
      return (
        haversineMiles(
          homeCity.latitude,
          homeCity.longitude,
          postCity.latitude,
          postCity.longitude
        ) <= radiusMiles
      );
    })
    .map((post) => {
      const postCity = cityById.get(post.city_id);
      const author = post.author as unknown as { full_name: string } | null;
      const likeCount = 0; // filled in below from a separate count query
      const canDelete = post.author_id === userData.user!.id;

      if (post.post_type === "org_event") {
        return {
          kind: "org_event",
          id: post.id,
          orgName: author?.full_name ?? "An organization",
          cityName: postCity?.name ?? "",
          description: post.description,
          createdAt: post.created_at,
          likeCount,
          likedByMe: likedPostIds.has(post.id),
          canDelete,
        } satisfies FeedItem;
      }

      if (post.post_type === "training") {
        return {
          kind: "training",
          id: post.id,
          authorName: author?.full_name ?? "A coach",
          cityName: postCity?.name ?? "",
          birthYear: post.birth_year,
          positions: post.positions ?? [],
          description: post.description,
          costCents: post.cost_cents,
          durationMinutes: post.duration_minutes,
          createdAt: post.created_at,
          likeCount,
          likedByMe: likedPostIds.has(post.id),
          canDelete,
        } satisfies FeedItem;
      }

      return {
        kind: post.post_type as "looking_for_team" | "guest_play",
        id: post.id,
        birthYear: post.birth_year,
        positions: post.positions ?? [],
        cityName: postCity?.name ?? "",
        description: post.description,
        // No player_id means a coach posted it, not a parent.
        authorName: post.player_id ? null : author?.full_name ?? "A coach",
        createdAt: post.created_at,
        likeCount,
        likedByMe: likedPostIds.has(post.id),
        canDelete,
      } satisfies FeedItem;
    });

  // Like counts, one grouped query rather than N+1 per card.
  const feedPostIds = feedItems.map((item) => item.id);
  if (feedPostIds.length > 0) {
    const { data: likeRows } = await supabase
      .from("feed_post_likes")
      .select("post_id")
      .in("post_id", feedPostIds);
    const counts = new Map<string, number>();
    for (const row of likeRows ?? []) {
      counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1);
    }
    for (const item of feedItems) {
      if (item.kind !== "roster_spot") {
        item.likeCount = counts.get(item.id) ?? 0;
      }
    }
  }

  const mergedItems = [...rosterItems, ...feedItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const allItems = mergedItems.filter((item) => {
    if (postTypeFilter.length > 0 && !postTypeFilter.includes(item.kind)) {
      return false;
    }
    if (birthYearFilter) {
      const birthYear = itemBirthYear(item);
      if (birthYear !== null && birthYear !== Number(birthYearFilter)) {
        return false;
      }
    }
    if (positionFilter.length > 0) {
      const positions = itemPositions(item);
      if (positions.length > 0 && !positions.some((p) => positionFilter.includes(p))) {
        return false;
      }
    }
    if (searchQuery && !itemSearchText(item).includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const hasActiveFilters =
    !!birthYearFilter || positionFilter.length > 0 || postTypeFilter.length > 0 || !!searchQuery;
  const activeFilterCount =
    (birthYearFilter ? 1 : 0) + (positionFilter.length > 0 ? 1 : 0) + postTypeFilter.length;

  const postTypeLabel = new Map<string, string>(
    POST_TYPE_OPTIONS.map((o) => [o.value, o.label])
  );

  // Preserves every other active param when removing just one filter
  // value — used to build each chip's "×" link below.
  function withoutFilter(kind: "birth_year" | "position" | "post_type", value?: string): string {
    const next = new URLSearchParams();
    if (kind !== "birth_year" && birthYearFilter) next.set("birth_year", birthYearFilter);
    if (kind !== "position") {
      for (const p of positionFilter) if (p !== value) next.append("positions", p);
    }
    if (kind !== "post_type") {
      for (const t of postTypeFilter) if (t !== value) next.append("post_type", t);
    }
    if (searchQuery) next.set("q", searchQuery);
    const qs = next.toString();
    return qs ? `/feed?${qs}` : "/feed";
  }

  const role = profile?.role;
  const postHref =
    role === "coach" || role === "parent" || role === "organization" ? "/feed/new" : null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Local feed</h1>
          <p className="mt-1 text-sm text-slate-600">
            Roster spots, families looking for a team, and event listings
            near you.
          </p>
        </div>
        {postHref ? (
          <Link
            href={postHref}
            className="shrink-0 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Post
          </Link>
        ) : null}
      </div>

      <div className="mt-6">
        <LocationSettings
          cities={cityList.map((c) => ({ id: c.id, name: c.name }))}
          homeCityId={profile?.home_city_id ?? null}
          radiusMiles={radiusMiles}
        />
      </div>

      <form method="get" className="mt-4">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4.3-4.3" />
          </svg>
          <input
            type="search"
            name="q"
            defaultValue={searchQuery}
            placeholder="Search the feed"
            className="w-full rounded-full border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
          />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400 [&::-webkit-details-marker]:hidden">
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
                <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </summary>

            <div className="absolute z-10 mt-2 w-[min(90vw,20rem)] space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
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
                  defaultValue={birthYearFilter}
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
                        defaultChecked={positionFilter.includes(position)}
                        className="h-3.5 w-3.5"
                      />
                      {position}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-sm font-medium text-slate-900">
                  Post type
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {POST_TYPE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
                    >
                      <input
                        type="checkbox"
                        name="post_type"
                        value={option.value}
                        defaultChecked={postTypeFilter.includes(option.value)}
                        className="h-3.5 w-3.5"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Apply filters
              </button>
            </div>
          </details>

          {hasActiveFilters ? (
            <Link
              href="/feed"
              className="text-xs font-medium text-slate-500 underline"
            >
              Clear all
            </Link>
          ) : null}
        </div>

        {/* Selected filters stay visible as chips even while the dropdown
            above is closed — each one links straight to the same view
            with just that filter removed. */}
        {activeFilterCount > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {birthYearFilter ? (
              <FilterChip href={withoutFilter("birth_year")}>
                {birthYearFilter}
              </FilterChip>
            ) : null}
            {positionFilter.map((position) => (
              <FilterChip key={position} href={withoutFilter("position", position)}>
                {position}
              </FilterChip>
            ))}
            {postTypeFilter.map((type) => (
              <FilterChip key={type} href={withoutFilter("post_type", type)}>
                {postTypeLabel.get(type) ?? type}
              </FilterChip>
            ))}
          </div>
        ) : null}
      </form>

      {allItems.length > 0 ? (
        <div className="mt-6 space-y-3">
          {allItems.map((item) => (
            <FeedCard key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-6 text-center">
          <p className="text-sm font-medium text-slate-900">
            Nothing in the feed yet
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {hasActiveFilters
              ? "Try widening your filters, or check back soon."
              : canFilterByRadius
                ? "Try widening your radius, or check back soon."
                : "Set your area above to start seeing local posts, or check back soon."}
          </p>
        </div>
      )}
    </main>
  );
}

function FilterChip({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
    >
      {children}
      <span aria-hidden="true">×</span>
    </Link>
  );
}
