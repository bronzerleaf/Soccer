// Small stat-style tile ("value" over "label") used in a horizontal row.
// Deliberately only ever fed descriptive facts already on the record —
// position, birth year, city, counts of real interactions like roster
// post likes — never a computed score, ranking, or performance metric
// (out of scope per CLAUDE.md §3: no stats tracking, no AI matching).
export function InfoTile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center rounded-xl border border-slate-200 bg-white px-2 py-3 text-center">
      <p className="truncate text-base font-semibold text-slate-900">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

export function InfoTileRow({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2">{children}</div>;
}
