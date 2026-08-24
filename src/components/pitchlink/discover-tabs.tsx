import Link from "next/link";

type Role = "parent" | "coach" | "admin" | "organization";
type TabKey = "teams" | "players" | "organizations";

const TABS_BY_ROLE: Record<string, { key: TabKey; href: string; label: string }[]> = {
  parent: [
    { key: "teams", href: "/teams", label: "Teams" },
    { key: "organizations", href: "/organizations", label: "Organizations" },
  ],
  coach: [
    { key: "players", href: "/search", label: "Players" },
    { key: "organizations", href: "/organizations", label: "Organizations" },
  ],
};

// Small segmented control pivoting between the two things "Discover"
// covers for this role, plus organizations (verified businesses/clubs
// posting events — same for both parent and coach, since org_event
// listings aren't role-gated the way player search is).
export function DiscoverTabs({ active, role }: { active: TabKey; role: Role }) {
  const tabs = TABS_BY_ROLE[role];
  if (!tabs) return null;

  return (
    <div className="mt-4 inline-flex rounded-full border border-gray-200 bg-white p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            tab.key === active
              ? "bg-gray-900 text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
