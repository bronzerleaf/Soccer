import Link from "next/link";

// In-page section label (16-18px/700 per FINAL_VISUAL_SPEC.md's
// "Section" scale) with an optional trailing link, e.g. "View All".
// The link is only ever rendered when the caller passes one — this
// component never fabricates a destination or a count.
export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {action ? (
          <Link href={action.href} className="shrink-0 text-sm font-semibold text-green-600">
            {action.label}
          </Link>
        ) : null}
      </div>
      {subtitle ? <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p> : null}
    </div>
  );
}
