import Link from "next/link";

const cardClass =
  "rounded-[18px] border border-gray-200 bg-white p-4 shadow-[0_3px_16px_rgba(17,24,39,0.07)]";

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
      className={`block ${cardClass} transition-colors hover:border-gray-300 active:bg-gray-50 ${className}`}
    >
      {children}
    </Link>
  );
}
