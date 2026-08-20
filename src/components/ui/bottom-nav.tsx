"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Tab = {
  href: string;
  label: string;
  icon: ReactNode;
  matchPrefix?: string;
  // "Profile" currently shares a destination with "Home" (no dedicated
  // account page exists yet — see bottom-nav.tsx's own tab-list comment).
  // Without this, both would show active at once on /dashboard.
  neverActive?: boolean;
};

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
  profile: (
    <svg {...iconProps}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.5 20c1-4.2 3.9-6.5 7.5-6.5s6.5 2.3 7.5 6.5" />
    </svg>
  ),
};

// Centered floating soccer-ball mark that sits above the tab row —
// cropped directly from the reference mockup's own ball graphic
// (public/ball-icon.png), not a redrawn SVG or emoji stand-in, so the
// shading, panel detail, and green ring match the source exactly.
function BallMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/ball-icon.png"
      alt=""
      aria-hidden="true"
      className="h-full w-full rounded-full object-cover"
    />
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

  // Fixed Home / Discover / (ball) / Messages / Profile shape per
  // docs/design-handoff/NAVIGATION_SPEC.md — the two roles with enough
  // surface area to fill all four side slots (parent, approved coach)
  // get it; a pending coach/org or admin keep their current narrow
  // single-purpose nav rather than pointing three tabs at nothing.
  // Two real routes lose their direct tab this way (a parent's own
  // /players, a coach's /roster-posts/mine) — both are now linked from
  // Home (/dashboard) instead so neither becomes unreachable.
  let tabs: Tab[] = [];

  if (role === "parent") {
    tabs = [
      { href: "/dashboard", label: "Home", icon: icons.home },
      { href: "/teams", label: "Discover", icon: icons.search },
      { href: "/messages", label: "Messages", icon: icons.message },
      { href: "/dashboard", label: "Profile", icon: icons.profile, neverActive: true },
    ];
  } else if (role === "coach") {
    tabs = coachApproved
      ? [
          { href: "/dashboard", label: "Home", icon: icons.home },
          { href: "/search", label: "Discover", icon: icons.search },
          { href: "/messages", label: "Messages", icon: icons.message },
          { href: "/dashboard", label: "Profile", icon: icons.profile, neverActive: true },
        ]
      : [{ href: "/coach/verify", label: "Verify", icon: icons.shield }];
  } else if (role === "organization") {
    tabs = organizationApproved
      ? [{ href: "/dashboard", label: "Home", icon: icons.home }]
      : [{ href: "/organization/verify", label: "Verify", icon: icons.shield }];
  } else if (role === "admin") {
    tabs = [{ href: "/admin", label: "Admin", icon: icons.shield }];
  }

  const half = Math.ceil(tabs.length / 2);
  const left = tabs.slice(0, half);
  const right = tabs.slice(half);

  const ballActive = pathname === "/feed" || pathname.startsWith("/feed/");

  function renderTab(tab: Tab) {
    const active =
      !tab.neverActive &&
      (pathname === tab.href ||
        (tab.matchPrefix ? pathname.startsWith(tab.matchPrefix) : pathname.startsWith(tab.href + "/")));
    return (
      <Link
        key={tab.label}
        href={tab.href}
        className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
          active ? "text-green-600" : "text-gray-400 hover:text-gray-600"
        }`}
      >
        {tab.icon}
        {tab.label}
        <span
          className={`h-1 w-1 rounded-full transition-colors ${active ? "bg-green-600" : "bg-transparent"}`}
          aria-hidden="true"
        />
      </Link>
    );
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
    >
      <div className="relative mx-auto flex max-w-lg items-stretch rounded-[24px] border border-gray-200 bg-white/95 px-1 shadow-[0_10px_28px_rgba(17,24,39,0.12)] backdrop-blur">
        {/* Left/right groups are equal-width so the gap between them —
            where the floating mark sits — is always the true horizontal
            center, regardless of how the tab count splits. */}
        <div className="flex flex-1 items-stretch justify-around">{left.map(renderTab)}</div>
        <div className="w-16 shrink-0" aria-hidden="true" />
        <div className="flex flex-1 items-stretch justify-around">{right.map(renderTab)}</div>

        <Link
          href="/feed"
          aria-label="Feed"
          className={`ball-mark absolute left-1/2 top-0 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white transition-transform ${
            ballActive ? "scale-105" : "hover:scale-105"
          }`}
        >
          <div className="h-full w-full overflow-hidden rounded-full">
            <BallMark />
          </div>
        </Link>
      </div>
    </nav>
  );
}
