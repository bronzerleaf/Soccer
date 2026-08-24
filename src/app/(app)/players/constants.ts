export const POSITIONS = ["GK", "Defender", "Midfielder", "Forward"] as const;
export const PREFERRED_FEET = ["left", "right", "both"] as const;

export const PLAYER_LEVELS = [
  { value: "recreational", label: "Recreational" },
  { value: "academy", label: "Academy" },
  { value: "competitive_select", label: "Competitive/Select" },
  { value: "pre_ecnl", label: "Pre-ECNL" },
  { value: "ecnl_rl", label: "ECNL-RL" },
  { value: "ecnl", label: "ECNL" },
  { value: "mls_next", label: "MLS NEXT" },
  { value: "girls_academy", label: "Girls Academy" },
  { value: "other", label: "Other" },
] as const;

export const PLAYER_LEVEL_LABELS: Record<string, string> = Object.fromEntries(
  PLAYER_LEVELS.map((level) => [level.value, level.label])
);
