/** Rink layout constants — see components/league/rink-roster.tsx. */

export type RinkSlot = "G" | "LD" | "RD" | "LW" | "C" | "RW";

export const RINK_SLOT_LABEL: Record<RinkSlot, string> = {
  G: "Goaltender",
  LD: "Left Defense",
  RD: "Right Defense",
  LW: "Left Wing",
  C: "Center",
  RW: "Right Wing",
};

/** Percentage-based coordinates within the rink diagram (top-down, attacking toward the top). */
export const RINK_SLOT_POSITION: Record<RinkSlot, { left: number; top: number }> = {
  G: { left: 50, top: 12 },
  LD: { left: 28, top: 32 },
  RD: { left: 72, top: 32 },
  LW: { left: 20, top: 62 },
  C: { left: 50, top: 68 },
  RW: { left: 80, top: 62 },
};
