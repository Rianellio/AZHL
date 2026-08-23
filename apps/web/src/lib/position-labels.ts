/**
 * Single source of truth for position abbreviation -> full name, matching Prisma's
 * PlayerPosition enum (C, LW, RW, D, G) exactly. The backend only stores generic "D" for
 * defense — it doesn't distinguish left/right — so real player data is labeled "Defense",
 * not "Left/Right Defense". LD/RD are used only for the rink diagram's layout slots (see
 * lib/mock/rink-positions.ts), which are positions on the ice, not a specific player's stored
 * position value.
 */
export const POSITION_LABEL: Record<string, string> = {
  C: "Center",
  LW: "Left Wing",
  RW: "Right Wing",
  D: "Defense",
  G: "Goaltender",
};
