import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export default async function AdminHomePage() {
  const { supabase } = await requireAdmin();

  const [
    { count: pendingCoaches },
    { count: flaggedMessages },
    { count: activePosts },
    { count: clubCount },
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
  ]);

  const sections = [
    {
      href: "/admin/coaches",
      label: "Coach verification queue",
      count: pendingCoaches ?? 0,
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
      href: "/admin/clubs",
      label: "Club list",
      count: clubCount ?? 0,
      countLabel: "clubs",
    },
  ];

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-xl font-semibold text-slate-900">Admin</h1>

      <ul className="mt-8 space-y-3">
        {sections.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:border-slate-300"
            >
              <span className="text-sm font-medium text-slate-900">
                {section.label}
              </span>
              <span className="text-sm text-slate-500">
                {section.count} {section.countLabel}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
