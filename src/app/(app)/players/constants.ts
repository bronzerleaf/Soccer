export const POSITIONS = [
  "GK",
  "RB/RWB",
  "CB",
  "LB/LWB",
  "CDM",
  "CM",
  "CAM",
  "RW",
  "LW",
  "ST/CF",
] as const;

export const PREFERRED_FEET = ["left", "right", "both"] as const;

export const LEVELS_OF_PLAY = [
  { value: "recreational", label: "Recreational" },
  { value: "academy", label: "Academy" },
  { value: "competitive", label: "Competitive / Club" },
  { value: "select", label: "Select" },
  { value: "pre_ecnl", label: "Pre-ECNL" },
  { value: "ecnl_rl", label: "ECNL-RL" },
  { value: "ecnl", label: "ECNL" },
  { value: "mls_next", label: "MLS NEXT" },
  { value: "girls_academy", label: "Girls Academy" },
  { value: "other", label: "Other" },
] as const;

export function levelLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return LEVELS_OF_PLAY.find((level) => level.value === value)?.label ?? value;
}
