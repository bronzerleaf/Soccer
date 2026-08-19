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
