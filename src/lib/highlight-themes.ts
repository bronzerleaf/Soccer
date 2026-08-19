// Matches the public.highlight_theme enum in
// supabase/migrations/20260109000000_player_highlights.sql exactly —
// update both together.
export const HIGHLIGHT_THEMES = [
  { value: "goal", label: "Goal", color: "#16a34a" },
  { value: "assist", label: "Assist", color: "#7c3aed" },
  { value: "defense", label: "Defense", color: "#2563eb" },
  { value: "offense", label: "Offense", color: "#ea580c" },
  { value: "skills", label: "Skills", color: "#0891b2" },
  { value: "full_match", label: "Full match", color: "#475569" },
] as const;

export type HighlightThemeValue = (typeof HIGHLIGHT_THEMES)[number]["value"];

const VALID_THEMES = new Set<string>(HIGHLIGHT_THEMES.map((t) => t.value));

export function isValidTheme(value: string): value is HighlightThemeValue {
  return VALID_THEMES.has(value);
}

export function themeMeta(
  value: string | null
): { label: string; color: string } | null {
  if (!value) return null;
  return HIGHLIGHT_THEMES.find((t) => t.value === value) ?? null;
}
