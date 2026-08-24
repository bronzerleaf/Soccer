import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LocationSettings } from "@/app/(app)/feed/location-settings";
import { haversineMiles } from "@/lib/geo";
import { formatTime } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { BackLink } from "@/components/pitchlink/back-link";
import { DiscoverTabs } from "@/components/pitchlink/discover-tabs";

// A directory of verified organizations (businesses, clubs, and other
// event hosts -- verified the same way a coach is, per CLAUDE.md
// section 9) and their upcoming feed listings. No new data model: this
// reads organization_verifications + feed_posts (post_type = org_event),
// both already real. Never a trainer marketplace -- there's no booking,
// payment, or 1:1 trainer profile here, just the same public event
// listings the feed already shows, organized by who's posting them.
export default async function OrganizationsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: orgs }, { data: events }, { data: cities }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("role, home_city_id, radius_miles")
        .eq("id", userData.user.id)
        .single(),
      supabase
        .from("organization_verifications")
        .select("organization_id, org_name")
        .eq("status", "approved")
        .order("org_name"),
      supabase
        .from("feed_posts")
        .select("id, author_id, description, event_date, event_time, location, signup_url, city_id")
        .eq("post_type", "org_event")
        .order("event_date", { ascending: true }),
      supabase.from("cities").select("id, name, latitude, longitude").order("name"),
    ]);

  const cityList = cities ?? [];
  const cityById = new Map(cityList.map((c) => [c.id, c]));
  const homeCity = profile?.home_city_id ? cityById.get(profile.home_city_id) : null;
  const radiusMiles = profile?.radius_miles ?? null;
  const canFilterByRadius = !!(homeCity && radiusMiles);

  const visibleEvents = (events ?? []).filter((event) => {
    if (!canFilterByRadius) return true;
    const eventCity = event.city_id ? cityById.get(event.city_id) : null;
    if (!eventCity || !homeCity) return true;
    return (
      haversineMiles(homeCity.latitude, homeCity.longitude, eventCity.latitude, eventCity.longitude) <=
      radiusMiles
    );
  });

  const eventsByOrg = new Map<string, typeof visibleEvents>();
  for (const event of visibleEvents) {
    const list = eventsByOrg.get(event.author_id) ?? [];
    list.push(event);
    eventsByOrg.set(event.author_id, list);
  }

  const role = (profile?.role ?? "parent") as "parent" | "coach" | "admin" | "organization";

  return (
    <main className="mx-auto max-w-lg px-6 py-12 pb-24">
      <BackLink href="/dashboard" label="Back to dashboard" />

      <h1 className="mt-3 text-xl font-semibold text-gray-900">Organizations</h1>
      <p className="mt-2 text-sm text-gray-600">
        Verified businesses and clubs posting tournaments, camps, and training
        sessions to the local feed.
      </p>

      <DiscoverTabs active="organizations" role={role} />

      <div className="mt-6">
        <LocationSettings
          cities={cityList.map((c) => ({ id: c.id, name: c.name }))}
          homeCityId={profile?.home_city_id ?? null}
          radiusMiles={radiusMiles}
        />
      </div>

      {orgs && orgs.length > 0 ? (
        <ul className="mt-8 space-y-3">
          {orgs.map((org) => {
            const orgEvents = eventsByOrg.get(org.organization_id) ?? [];
            return (
              <li key={org.organization_id}>
                <Card>
                  <p className="text-sm font-semibold text-gray-900">{org.org_name}</p>
                  {orgEvents.length > 0 ? (
                    <ul className="mt-3 space-y-3">
                      {orgEvents.map((event) => (
                        <li key={event.id}>
                          <Link
                            href={`/feed/post/${event.id}`}
                            className="block rounded-lg border border-gray-200 p-3 hover:border-gray-300"
                          >
                            <p className="text-sm text-gray-900">{event.description}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {event.event_date
                                ? new Date(`${event.event_date}T00:00:00`).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })
                                : null}
                              {event.event_time ? ` · ${formatTime(event.event_time)}` : ""}
                              {event.location ? ` · ${event.location}` : ""}
                            </p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-gray-400">No upcoming events posted.</p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-gray-600">
          No verified organizations yet — they show up here once an admin
          approves one.
        </p>
      )}
    </main>
  );
}
