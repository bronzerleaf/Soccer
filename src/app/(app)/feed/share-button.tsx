"use client";

import { useToast } from "@/components/ui/toast-provider";

// Copies a link to the post's own OpenRoster page -- still behind the
// same login wall as every other route here (see the [id] page's own
// auth check), so a share never leaks a post outside the platform, only
// to another signed-in account. Per CLAUDE.md section 9: no public,
// unauthenticated share surface.
export function ShareButton({ href }: { href: string }) {
  const toast = useToast();

  async function handleClick() {
    const url = `${window.location.origin}${href}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      toast("Could not copy the link", "error");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-400"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
      >
        <circle cx="18" cy="5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="19" r="2.5" />
        <path d="M8.2 10.8 15.8 6.7M8.2 13.2l7.6 4.1" />
      </svg>
      Share
    </button>
  );
}
