import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export default async function AdminHomePage() {
  const { supabase } = await requireAdmin();

  const [
    { count: pendingCoaches },
    { count: flaggedMessages },
    { count: activePosts },
    { count: clubCount },
    { count: pendingOrganizations },
    { count: activeFeedPosts },
    { count: pendingTeams },
  ] = await Promise.all([
    supabase
      .from("coach_verifications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("message_flags").select("id", { count: "exact", head: true }),
    supabase
      .from("roster_posts")
      .select("id", { count: "exact", head: true })
      .gt("expires_at", new Date().toISOString()),
    supabase.from("clubs").select("id", { count: "exact", head: true }),
    supabase
      .from("organization_verifications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("feed_posts")
      .select("id", { count: "exact", head: true })
      .gt("expires_at", new Date().toISOString()),
    supabase
      .from("team_verifications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const sections = [
    {
      href: "/admin/coaches",
      label: "Coach verification queue",
      count: pendingCoaches ?? 0,
      countLabel: "pending",
    },
    {
      href: "/admin/organizations",
      label: "Organization verification queue",
      count: pendingOrganizations ?? 0,
      countLabel: "pending",
    },
    {
      href: "/admin/teams",
      label: "Team verification queue",
      count: pendingTeams ?? 0,
      countLabel: "pending",
    },
    {
      href: "/admin/messages",
      label: "Flagged messages",
      count: flaggedMessages ?? 0,
      countLabel: "flagged",
    },
    {
      href: "/admin/roster-posts",
      label: "Roster posts",
      count: activePosts ?? 0,
      countLabel: "active",
    },
    {
      href: "/admin/feed-posts",
      label: "Local feed posts",
      count: activeFeedPosts ?? 0,
      countLabel: "active",
    },
    {
      href: "/admin/clubs",
      label: "Club list",
      count: clubCount ?? 0,
      countLabel: "clubs",
    },
  ];

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-xl font-semibold text-gray-900">Admin</h1>

      <ul className="mt-8 space-y-3">
        {sections.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:border-gray-300"
            >
              <span className="text-sm font-medium text-gray-900">
                {section.label}
              </span>
              <span className="text-sm text-gray-500">
                {section.count} {section.countLabel}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
