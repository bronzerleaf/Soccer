import Link from "next/link";

const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`${cardClass} ${className}`}>{children}</div>;
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
