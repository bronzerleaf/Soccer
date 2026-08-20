import Link from "next/link";

const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.08)]";

export function Card({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return <div id={id} className={`${cardClass} ${className}`}>{children}</div>;
}

export function CardLink({
  href,
  className = "",
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`block ${cardClass} transition-colors hover:border-slate-300 active:bg-slate-50 ${className}`}
    >
      {children}
    </Link>
  );
}
