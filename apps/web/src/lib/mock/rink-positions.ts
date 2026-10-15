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

/** Percentage-based coordinates within the rink diagram — defensive view: the team's own goal is
 * at the top (goaltender there), opponents attack upward toward it. */
export const RINK_SLOT_POSITION: Record<RinkSlot, { left: number; top: number }> = {
  G: { left: 50, top: 12 },
  LD: { left: 28, top: 32 },
  RD: { left: 72, top: 32 },
  LW: { left: 20, top: 62 },
  C: { left: 50, top: 68 },
  RW: { left: 80, top: 62 },
};

/**
 * Places a roster onto the six rink slots. One player per slot: the lowest jersey number wins
 * for C/LW/RW/G; the two lowest-numbered defensemen take LD then RD. Slots with no matching
 * player stay empty. Replaced by a real lineup source once lines/lineups exist in the schema.
 */
export function assignPlayersToSlots<T extends { position: string; jerseyNumber: number }>(
  players: T[],
): Record<RinkSlot, T | undefined> {
  const byNumber = [...players].sort((a, b) => a.jerseyNumber - b.jerseyNumber);
  const first = (position: string) => byNumber.find((p) => p.position === position);
  const defense = byNumber.filter((p) => p.position === "D");
  return {
    G: first("G"),
    C: first("C"),
    LW: first("LW"),
    RW: first("RW"),
    LD: defense[0],
    RD: defense[1],
  };
}
