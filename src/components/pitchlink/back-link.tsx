import Link from "next/link";

// Standalone circular icon back button — same mark as AppHeader's built-in
// back button, for screens that want just the button (no centered title
// row) above their own <h1>.
export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:border-gray-300"
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
  );
}
