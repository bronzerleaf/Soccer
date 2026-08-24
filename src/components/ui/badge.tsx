type BadgeTone = "verified" | "pending" | "neutral" | "accent";

const tones: Record<BadgeTone, string> = {
  verified: "bg-green-50 text-green-700",
  pending: "bg-amber-50 text-amber-700",
  neutral: "bg-gray-100 text-gray-600",
  accent: "bg-gray-900 text-white",
};

export function Badge({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

// Small checkmark-in-circle, used next to a name/title to mean "verified
// by OpenRoster admin" — coach verification, consent completion, etc.
// Never decorative on its own; always paired with the specific claim.
export function VerifiedMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={`inline-block h-4 w-4 shrink-0 text-green-600 ${className}`}
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="9" fill="currentColor" fillOpacity="0.12" />
      <path
        d="M6.5 10.3 8.7 12.5 13.5 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
