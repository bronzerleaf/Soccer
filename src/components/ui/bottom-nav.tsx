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

// Centered floating soccer-ball mark that sits above the tab row — the
// literal ball glyph from the reference design (flat black/white panels,
// no gradient), ringed in the app's green accent.
function BallMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#fff" stroke="#0f172a" strokeWidth="1" />
      <path d="M12 7.5 16 10.3 14.5 15 9.5 15 8 10.3Z" fill="#0f172a" />
      <path
        d="M12 7.5 12 2.2M16 10.3 20.8 8.7M14.5 15 17.5 19.5M9.5 15 6.5 19.5M8 10.3 3.2 8.7"
        stroke="#0f172a"
        strokeWidth="1.3"
        strokeLinecap="round"
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
          className={`absolute left-1/2 top-0 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] bg-white shadow-md transition-colors ${
            homeActive ? "border-green-600" : "border-green-500 hover:border-green-600"
          }`}
        >
          <BallMark />
        </Link>
      </div>
    </nav>
  );
}
