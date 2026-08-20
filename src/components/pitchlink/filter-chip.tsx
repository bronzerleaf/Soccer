import Link from "next/link";
import type { ReactNode } from "react";

// A removable filter pill — links straight to the same view with just
// that one filter value stripped out. Used by any page with an
// active-filters row (currently /feed; /search follows the same
// pattern inline today and can move to this later).
export function FilterChip({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
    >
      {children}
      <span aria-hidden="true">×</span>
    </Link>
  );
}
