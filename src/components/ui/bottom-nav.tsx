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
  discover: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" />
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
  message: (
    <svg {...iconProps}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4 4v-4H5.5A1.5 1.5 0 0 1 4 14.5v-9Z" />
    </svg>
  ),
  profile: (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20c.6-4 3-6.2 6.5-6.2s5.9 2.2 6.5 6.2" />
    </svg>
  ),
  shield: (
    <svg {...iconProps}>
      <path d="M12 3.5 5 6v6c0 4.6 3 7.8 7 9 4-1.2 7-4.4 7-9V6l-7-2.5Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
};

function SoccerBall() {
  return (
    <svg viewBox="0 0 64 64" className="h-12 w-12" aria-hidden="true">
      <circle cx="32" cy="32" r="29" fill="white" stroke="#0b1736" strokeWidth="2" />
      <path d="m32 17 9 6-3 11H26l-3-11 9-6Z" fill="#0b1736" />
      <path d="m23 23-10 2-5 9 7 9 10-3M41 23l10 2 5 9-7 9-10-3M26 34l-7 10 4 11M38 34l7 10-4 11M19 44h26" fill="none" stroke="#0b1736" strokeWidth="2" strokeLinejoin="round" />
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

  let leftTabs: Tab[] = [];
  let rightTabs: Tab[] = [];

  if (role === "parent") {
    leftTabs = [
      { href: "/teams", label: "Discover", icon: icons.discover },
      { href: "/players", label: "Players", icon: icons.players },
    ];
    rightTabs = [
      { href: "/messages", label: "Messages", icon: icons.message },
      { href: "/dashboard", label: "Profile", icon: icons.profile },
    ];
  } else if (role === "coach" && coachApproved) {
    leftTabs = [
      { href: "/search", label: "Discover", icon: icons.discover },
      { href: "/teams", label: "Teams", icon: icons.players },
    ];
    rightTabs = [
      { href: "/messages", label: "Messages", icon: icons.message },
      { href: "/dashboard", label: "Profile", icon: icons.profile },
    ];
  } else if (role === "organization" && organizationApproved) {
    leftTabs = [{ href: "/dashboard", label: "Home", icon: icons.discover }];
    rightTabs = [{ href: "/dashboard", label: "Profile", icon: icons.profile }];
  } else if (role === "admin") {
    leftTabs = [{ href: "/admin", label: "Admin", icon: icons.shield }];
    rightTabs = [{ href: "/dashboard", label: "Profile", icon: icons.profile }];
  } else {
    const verifyHref = role === "coach" ? "/coach/verify" : "/organization/verify";
    leftTabs = [{ href: verifyHref, label: "Verify", icon: icons.shield }];
    rightTabs = [{ href: "/dashboard", label: "Profile", icon: icons.profile }];
  }

  const isActive = (tab: Tab) =>
    pathname === tab.href ||
    (tab.matchPrefix
      ? pathname.startsWith(tab.matchPrefix)
      : pathname.startsWith(tab.href + "/"));

  const renderTab = (tab: Tab) => (
    <Link
      key={`${tab.href}-${tab.label}`}
      href={tab.href}
      className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
        isActive(tab) ? "text-emerald-600" : "text-slate-400 hover:text-slate-700"
      }`}
    >
      {tab.icon}
      <span className="truncate">{tab.label}</span>
    </Link>
  );

  const feedActive = pathname === "/feed" || pathname.startsWith("/feed/");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary navigation"
    >
      <div className="mx-auto max-w-lg px-3 pb-2">
        <div className="relative flex h-[70px] items-end rounded-[26px] border border-slate-200/80 bg-white/95 px-2 shadow-[0_14px_40px_rgba(11,23,54,0.14)] backdrop-blur-xl">
          <div className="flex min-w-0 flex-1">{leftTabs.map(renderTab)}</div>

          <div className="w-[78px] shrink-0" aria-hidden="true" />

          <div className="flex min-w-0 flex-1">{rightTabs.map(renderTab)}</div>

          <Link
            href="/feed"
            aria-label="Feed"
            className={`absolute left-1/2 top-0 flex h-[68px] w-[68px] -translate-x-1/2 -translate-y-[24px] items-center justify-center rounded-full border-[5px] bg-white shadow-[0_12px_24px_rgba(11,23,54,0.2)] transition-transform active:scale-95 ${
              feedActive ? "border-emerald-500" : "border-white ring-2 ring-emerald-500"
            }`}
          >
            <SoccerBall />
          </Link>
          <span
            className={`absolute left-1/2 bottom-1.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
              feedActive ? "bg-emerald-500" : "bg-slate-200"
            }`}
            aria-hidden="true"
          />
        </div>
      </div>
    </nav>
  );
}
