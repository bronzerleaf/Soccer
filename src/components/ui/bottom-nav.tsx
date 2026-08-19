"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Tab = { href: string; label: string; icon: ReactNode; matchPrefix?: string };

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const icons = {
  home: (
    <svg {...iconProps}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-5.5h4V20h3a1 1 0 0 0 1-1v-9" />
    </svg>
  ),
  players: (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9.5" r="2.3" />
      <path d="M3.5 20c.5-3.4 2.7-5.5 5.5-5.5s5 2.1 5.5 5.5" />
      <path d="M15.2 14.8c2.2.4 3.6 2.1 4 5.2" />
    </svg>
  ),
  clipboard: (
    <svg {...iconProps}>
      <rect x="5.5" y="4.5" width="13" height="16" rx="1.5" />
      <path d="M9 4.5V3.8A1.3 1.3 0 0 1 10.3 2.5h3.4A1.3 1.3 0 0 1 15 3.8v.7" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 17.5h4" />
    </svg>
  ),
  message: (
    <svg {...iconProps}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4 4v-4H5.5A1.5 1.5 0 0 1 4 14.5v-9Z" />
    </svg>
  ),
  search: (
    <svg {...iconProps}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.6-4.6" />
    </svg>
  ),
  shield: (
    <svg {...iconProps}>
      <path d="M12 3.5 5 6v6c0 4.6 3 7.8 7 9 4-1.2 7-4.4 7-9V6l-7-2.5Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  pin: (
    <svg {...iconProps}>
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  ),
};

// Centered floating "Home" mark that sits above the tab row, echoing the
// club-crest/ball mark pattern from the reference design. Kept flat and
// monochrome (no gradient, no literal soccer ball graphic) to stay in
// line with CLAUDE.md's "competent and calm, not sports-tech" direction.
function HomeMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 11.5 12 4l8 7.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 10v9a1 1 0 0 0 1 1h3v-5.5h4V20h3a1 1 0 0 0 1-1v-9"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BottomNav({
  role,
  coachApproved,
  organizationApproved,
}: {
  role: "parent" | "coach" | "admin" | "organization";
  coachApproved: boolean;
  organizationApproved?: boolean;
}) {
  const pathname = usePathname();

  let tabs: Tab[] = [];

  if (role === "parent") {
    tabs = [
      { href: "/players", label: "Players", icon: icons.players },
      { href: "/feed", label: "Feed", icon: icons.pin },
      { href: "/messages", label: "Messages", icon: icons.message },
    ];
  } else if (role === "coach") {
    tabs = coachApproved
      ? [
          { href: "/search", label: "Search", icon: icons.search },
          { href: "/roster-posts/mine", label: "Roster Posts", icon: icons.clipboard, matchPrefix: "/roster-posts" },
          { href: "/feed", label: "Feed", icon: icons.pin },
          { href: "/messages", label: "Messages", icon: icons.message },
        ]
      : [{ href: "/coach/verify", label: "Verify", icon: icons.shield }];
  } else if (role === "organization") {
    tabs = organizationApproved
      ? [{ href: "/feed", label: "Feed", icon: icons.pin }]
      : [{ href: "/organization/verify", label: "Verify", icon: icons.shield }];
  } else if (role === "admin") {
    tabs = [{ href: "/admin", label: "Admin", icon: icons.shield }];
  }

  const half = Math.ceil(tabs.length / 2);
  const left = tabs.slice(0, half);
  const right = tabs.slice(half);
  const homeActive = pathname === "/dashboard";

  function renderTab(tab: Tab) {
    const active =
      pathname === tab.href ||
      (tab.matchPrefix ? pathname.startsWith(tab.matchPrefix) : pathname.startsWith(tab.href + "/"));
    return (
      <Link
        key={tab.href}
        href={tab.href}
        className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
          active ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
        }`}
      >
        {tab.icon}
        {tab.label}
      </Link>
    );
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative mx-auto flex max-w-lg items-stretch">
        {/* Left/right groups are equal-width so the gap between them —
            where the floating mark sits — is always the true horizontal
            center, regardless of how the tab count splits. */}
        <div className="flex flex-1 items-stretch justify-around">{left.map(renderTab)}</div>
        <div className="w-16 shrink-0" aria-hidden="true" />
        <div className="flex flex-1 items-stretch justify-around">{right.map(renderTab)}</div>

        <Link
          href="/dashboard"
          aria-label="Home"
          className={`absolute left-1/2 top-0 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white shadow-md transition-colors ${
            homeActive ? "bg-slate-900" : "bg-slate-700 hover:bg-slate-900"
          }`}
        >
          <HomeMark />
        </Link>
      </div>
    </nav>
  );
}
