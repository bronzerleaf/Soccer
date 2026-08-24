"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Tab = {
  href: string;
  label: string;
  icon: ReactNode;
  matchPrefix?: string;
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
  profile: (
    <svg {...iconProps}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.5 20c1-4.2 3.9-6.5 7.5-6.5s6.5 2.3 7.5 6.5" />
    </svg>
  ),
  plus: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
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

  // Profile / Discover / (ball=Feed) / Post / Messages — no "Home" tab:
  // /dashboard is reachable as "Profile" instead of duplicating it under
  // two labels. A parent's own /players and a coach's /roster-posts/mine
  // still lose their direct tab this way; both stay linked from Profile
  // (/dashboard) so neither becomes unreachable.
  let tabs: Tab[] = [];

  if (role === "parent") {
    tabs = [
      { href: "/dashboard", label: "Profile", icon: icons.profile },
      { href: "/teams", label: "Discover", icon: icons.search },
      { href: "/post", label: "Post", icon: icons.plus },
      { href: "/messages", label: "Messages", icon: icons.message },
    ];
  } else if (role === "coach") {
    tabs = coachApproved
      ? [
          { href: "/dashboard", label: "Profile", icon: icons.profile },
          { href: "/search", label: "Discover", icon: icons.search },
          { href: "/post", label: "Post", icon: icons.plus },
          { href: "/messages", label: "Messages", icon: icons.message },
        ]
      : [{ href: "/coach/verify", label: "Verify", icon: icons.shield }];
  } else if (role === "organization") {
    tabs = organizationApproved
      ? [{ href: "/dashboard", label: "Profile", icon: icons.profile }]
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
      pathname === tab.href ||
      (tab.matchPrefix ? pathname.startsWith(tab.matchPrefix) : pathname.startsWith(tab.href + "/"));
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
        <div
          className={`flex w-16 shrink-0 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
            ballActive ? "text-green-600" : "text-gray-400"
          }`}
          aria-hidden="true"
        >
          <span className="h-[22px]" />
          Feed
          <span
            className={`h-1 w-1 rounded-full transition-colors ${ballActive ? "bg-green-600" : "bg-transparent"}`}
          />
        </div>
        <div className="flex flex-1 items-stretch justify-around">{right.map(renderTab)}</div>

        <Link
          href="/feed"
          aria-label="Feed"
          className={`ball-mark absolute left-1/2 top-0 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white transition-transform ${
            ballActive ? "scale-105 ring-2 ring-green-500" : "hover:scale-105"
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
