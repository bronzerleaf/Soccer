// Formats a Postgres `time` column's "HH:MM:SS" string as "6:00 PM" —
// shared by roster posts and feed posts, the two places an event time
// gets shown on a card or detail page.
export function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(":");
  const hour24 = Number(hourStr);
  const minute = Number(minuteStr);
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

// Compact "2h" / "3d" style relative timestamp for an inbox row — the
// mainstream-messenger convention, full precision is what the thread
// view's formatTime() is for.
export function formatRelativeTime(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
