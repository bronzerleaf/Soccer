import Link from "next/link";
import type { ReactNode } from "react";

// Screen-level header: optional circular back button, centered title
// (22-24px/700 per docs/design-handoff/FINAL_VISUAL_SPEC.md's "Screen
// title" scale), optional right-side action slot. The 3-column grid
// keeps the title visually centered regardless of whether the back
// button or action is present.
export function AppHeader({
  title,
  backHref,
  backLabel = "Back",
  action,
}: {
  title: string;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[36px_1fr_36px] items-center gap-2">
      {backHref ? (
        <Link
          href={backHref}
          aria-label={backLabel}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:border-gray-300"
        >
          <svg width="9" height="15" viewBox="0 0 12 20" fill="none">
            <path
              d="M10 2L2 10l8 8"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      ) : (
        <div aria-hidden="true" />
      )}
      <h1 className="truncate text-center text-[22px] font-bold text-gray-900">{title}</h1>
      {action ?? <div aria-hidden="true" />}
    </div>
  );
}
