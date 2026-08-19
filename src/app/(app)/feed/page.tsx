import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { haversineMiles } from "@/lib/geo";
import { LocationSettings } from "./location-settings";
import { FeedCard, type FeedItem } from "./feed-card";

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

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
          "id, post_type, author_id, city_id, birth_year, positions, description, created_at, author:profiles(full_name)"
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

      return {
        kind: post.post_type as "looking_for_team" | "guest_play",
        id: post.id,
        birthYear: post.birth_year,
        positions: post.positions ?? [],
        cityName: postCity?.name ?? "",
        description: post.description,
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

  const allItems = [...rosterItems, ...feedItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const role = profile?.role;
  const postHref =
    role === "coach"
      ? "/roster-posts/new"
      : role === "parent" || role === "organization"
        ? "/feed/new"
        : null;

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
            {canFilterByRadius
              ? "Try widening your radius, or check back soon."
              : "Set your area above to start seeing local posts, or check back soon."}
          </p>
        </div>
      )}
    </main>
  );
}
