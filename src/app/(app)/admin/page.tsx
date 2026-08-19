import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export default async function AdminHomePage() {
  const { supabase } = await requireAdmin();

  const [
    { count: pendingCoaches },
    { count: pendingTrainers },
    { count: flaggedMessages },
    { count: activePosts },
    { count: clubCount },
    { count: pendingOrganizations },
    { count: activeFeedPosts },
    { count: pendingTeams },
  ] = await Promise.all([
    supabase.from("coach_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("trainer_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("message_flags").select("id", { count: "exact", head: true }),
    supabase.from("roster_posts").select("id", { count: "exact", head: true }).gt("expires_at", new Date().toISOString()),
    supabase.from("clubs").select("id", { count: "exact", head: true }),
    supabase.from("organization_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("feed_posts").select("id", { count: "exact", head: true }).gt("expires_at", new Date().toISOString()),
    supabase.from("team_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const sections = [
    { href: "/admin/coaches", label: "Coach verification queue", count: pendingCoaches ?? 0, countLabel: "pending" },
    { href: "/admin/trainers", label: "Trainer verification queue", count: pendingTrainers ?? 0, countLabel: "pending" },
    { href: "/admin/organizations", label: "Organization verification queue", count: pendingOrganizations ?? 0, countLabel: "pending" },
    { href: "/admin/teams", label: "Team verification queue", count: pendingTeams ?? 0, countLabel: "pending" },
    { href: "/admin/messages", label: "Flagged messages", count: flaggedMessages ?? 0, countLabel: "flagged" },
    { href: "/admin/roster-posts", label: "Roster posts", count: activePosts ?? 0, countLabel: "active" },
    { href: "/admin/feed-posts", label: "Feed posts", count: activeFeedPosts ?? 0, countLabel: "active" },
    { href: "/admin/clubs", label: "Club list", count: clubCount ?? 0, countLabel: "clubs" },
  ];

  return (
    <main className="mx-auto max-w-lg px-6 py-12 pb-24">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">PitchLink</p>
      <h1 className="mt-1 text-2xl font-black text-[#0b1736]">Admin</h1>
      <ul className="mt-7 space-y-3">
        {sections.map((section) => (
          <li key={section.href}>
            <Link href={section.href} className="pitch-card flex items-center justify-between p-4">
              <span className="text-sm font-black text-[#0b1736]">{section.label}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{section.count} {section.countLabel}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
