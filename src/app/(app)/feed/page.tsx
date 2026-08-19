import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { haversineMiles } from "@/lib/geo";
import { LocationSettings } from "./location-settings";
import { FeedCard, type FeedItem } from "./feed-card";
import { ClipFeedSection } from "./clip-feed-section";

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const params = await searchParams;
  const searchQuery = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  const typeFilter = toArray(params.type);

  const [{ data: profile }, { data: cities }] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, home_city_id, radius_miles")
      .eq("id", userData.user.id)
      .single(),
    supabase.from("cities").select("id, name, latitude, longitude").order("name"),
  ]);

  const cityList = cities ?? [];
  const cityById = new Map(cityList.map((city) => [city.id, city]));
  const homeCity = profile?.home_city_id ? cityById.get(profile.home_city_id) : null;
  const radiusMiles = profile?.radius_miles ?? null;
  const canFilterByRadius = Boolean(homeCity && radiusMiles);

  const [{ data: rosterPosts }, { data: feedPosts }, { data: myLikes }, { data: myRosterLikes }] = await Promise.all([
    supabase
      .from("roster_posts")
      .select("id, birth_year, positions, created_at, club:clubs(name, city)")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("feed_posts")
      .select("id, post_type, author_id, city_id, player_id, birth_year, positions, description, cost_cents, duration_minutes, event_date, event_time, location, signup_url, created_at, author:profiles(full_name)")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("feed_post_likes").select("post_id").eq("profile_id", userData.user.id),
    supabase.from("roster_post_likes").select("post_id").eq("profile_id", userData.user.id),
  ]);

  const likedPostIds = new Set((myLikes ?? []).map((row) => row.post_id));
  const likedRosterIds = new Set((myRosterLikes ?? []).map((row) => row.post_id));

  const rosterItems: FeedItem[] = (rosterPosts ?? []).map((post) => {
    const club = post.club as unknown as { name: string; city: string } | null;
    return {
      kind: "roster_spot",
      id: post.id,
      birthYear: post.birth_year,
      positions: post.positions ?? [],
      clubName: club?.name ?? "Club",
      clubCity: club?.city ?? "",
      createdAt: post.created_at,
      likeCount: 0,
      likedByMe: likedRosterIds.has(post.id),
    };
  });

  const feedItems: FeedItem[] = (feedPosts ?? [])
    .filter((post) => {
      if (!canFilterByRadius || !homeCity) return true;
      const postCity = cityById.get(post.city_id);
      if (!postCity) return true;
      return haversineMiles(
        homeCity.latitude,
        homeCity.longitude,
        postCity.latitude,
        postCity.longitude
      ) <= (radiusMiles ?? 0);
    })
    .map((post) => {
      const city = cityById.get(post.city_id);
      const author = post.author as unknown as { full_name: string } | null;
      const common = {
        id: post.id,
        createdAt: post.created_at,
        likeCount: 0,
        likedByMe: likedPostIds.has(post.id),
        canDelete: post.author_id === userData.user!.id,
      };

      if (post.post_type === "org_event") {
        return {
          kind: "org_event",
          ...common,
          orgName: author?.full_name ?? "Organization",
          cityName: city?.name ?? "",
          description: post.description,
          eventDate: post.event_date,
          eventTime: post.event_time,
          location: post.location,
          signupUrl: post.signup_url,
        } satisfies FeedItem;
      }

      if (post.post_type === "training") {
        return {
          kind: "training",
          ...common,
          authorName: author?.full_name ?? "Soccer professional",
          cityName: city?.name ?? "",
          birthYear: post.birth_year,
          positions: post.positions ?? [],
          description: post.description,
          costCents: post.cost_cents,
          durationMinutes: post.duration_minutes,
          eventDate: post.event_date,
          eventTime: post.event_time,
          location: post.location,
          signupUrl: post.signup_url,
        } satisfies FeedItem;
      }

      return {
        kind: post.post_type as "looking_for_team" | "guest_play",
        ...common,
        birthYear: post.birth_year,
        positions: post.positions ?? [],
        cityName: city?.name ?? "",
        description: post.description,
        authorName: post.player_id ? null : author?.full_name ?? "Soccer professional",
        eventDate: post.event_date,
        eventTime: post.event_time,
        location: post.location,
        signupUrl: post.signup_url,
      } satisfies FeedItem;
    });

  const feedIds = feedItems.map((item) => item.id);
  const rosterIds = rosterItems.map((item) => item.id);
  const [{ data: feedLikeRows }, { data: rosterLikeRows }] = await Promise.all([
    feedIds.length ? supabase.from("feed_post_likes").select("post_id").in("post_id", feedIds) : Promise.resolve({ data: [] }),
    rosterIds.length ? supabase.from("roster_post_likes").select("post_id").in("post_id", rosterIds) : Promise.resolve({ data: [] }),
  ]);

  const feedCounts = new Map<string, number>();
  for (const row of feedLikeRows ?? []) feedCounts.set(row.post_id, (feedCounts.get(row.post_id) ?? 0) + 1);
  const rosterCounts = new Map<string, number>();
  for (const row of rosterLikeRows ?? []) rosterCounts.set(row.post_id, (rosterCounts.get(row.post_id) ?? 0) + 1);
  for (const item of feedItems) item.likeCount = feedCounts.get(item.id) ?? 0;
  for (const item of rosterItems) item.likeCount = rosterCounts.get(item.id) ?? 0;

  const opportunityItems = [...rosterItems, ...feedItems]
    .filter((item) => typeFilter.length === 0 || typeFilter.includes(item.kind))
    .filter((item) => {
      if (!searchQuery) return true;
      const text = item.kind === "roster_spot"
        ? `${item.clubName} ${item.clubCity} ${item.birthYear} ${item.positions.join(" ")}`
        : `${"description" in item ? item.description : ""} ${"cityName" in item ? item.cityName : ""} ${"authorName" in item && item.authorName ? item.authorName : ""} ${"orgName" in item ? item.orgName : ""}`;
      return text.toLowerCase().includes(searchQuery);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const role = profile?.role;
  const canPost = role === "parent" || role === "coach" || role === "organization" || role === "trainer";

  return (
    <main className="mx-auto max-w-2xl px-4 pb-32 pt-7 sm:px-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">PitchLink</p>
          <h1 className="pitch-gradient-text mt-1 text-3xl font-black tracking-tight">Feed</h1>
          <p className="mt-1 text-sm leading-5 text-slate-500">Clips, roster opportunities, guest play, training and soccer events.</p>
        </div>
        {canPost ? <Link href="/feed/new" className="rounded-xl bg-[#0b1736] px-4 py-2.5 text-xs font-black text-white shadow-sm">Post</Link> : null}
      </header>

      <div className="mt-5">
        <LocationSettings
          cities={cityList.map((city) => ({ id: city.id, name: city.name }))}
          homeCityId={profile?.home_city_id ?? null}
          radiusMiles={radiusMiles}
        />
      </div>

      <form method="get" className="mt-4 space-y-3">
        <div className="pitch-card flex items-center gap-2 p-3">
          <span className="text-slate-400">⌕</span>
          <input name="q" type="search" defaultValue={typeof params.q === "string" ? params.q : ""} placeholder="Search opportunities and events..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
          <button type="submit" className="rounded-xl bg-[#0b1736] px-3 py-2 text-xs font-bold text-white">Search</button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            ["", "All"],
            ["roster_spot", "Roster"],
            ["guest_play", "Guest play"],
            ["training", "Training"],
            ["org_event", "Events"],
          ].map(([value, label]) => {
            const active = value === "" ? typeFilter.length === 0 : typeFilter.includes(value);
            const href = value ? `/feed?type=${encodeURIComponent(value)}` : "/feed";
            return <Link key={label} href={href} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${active ? "bg-[#0b1736] text-white" : "pitch-pill text-slate-600"}`}>{label}</Link>;
          })}
        </div>
      </form>

      <ClipFeedSection />

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">Opportunities</p>
            <h2 className="mt-1 text-lg font-black text-[#0b1736]">Around the soccer community</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{opportunityItems.length}</span>
        </div>

        {opportunityItems.length > 0 ? (
          <div className="space-y-4">
            {opportunityItems.map((item) => <FeedCard key={`${item.kind}-${item.id}`} item={item} />)}
          </div>
        ) : (
          <div className="pitch-card p-7 text-center">
            <div className="text-3xl">⚽</div>
            <p className="mt-2 text-sm font-black text-[#0b1736]">No matching opportunities yet</p>
            <p className="mt-1 text-xs text-slate-500">Try clearing the filter or widening your local area.</p>
          </div>
        )}
      </section>
    </main>
  );
}
