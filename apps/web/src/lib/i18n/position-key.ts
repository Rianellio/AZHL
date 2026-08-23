import type { TranslationKey } from "./dictionaries";

/** Maps Prisma's PlayerPosition enum values (C/LW/RW/D/G) to dictionary keys — matches
 * lib/position-labels.ts's POSITION_LABEL one-for-one, translated instead of English-only. */
const POSITION_KEY: Record<string, TranslationKey> = {
  C: "position.center",
  LW: "position.leftWing",
  RW: "position.rightWing",
  D: "position.defense",
  G: "position.goaltender",
};

/** Rink diagram slots (see lib/mock/rink-positions.ts) — layout positions on the ice, not a
 * player's stored position value, hence the separate LD/RD entries. */
const RINK_SLOT_KEY: Record<string, TranslationKey> = {
  ...POSITION_KEY,
  LD: "position.leftDefense",
  RD: "position.rightDefense",
};

export function positionTranslationKey(position: string): TranslationKey | undefined {
  return POSITION_KEY[position];
}

export function rinkSlotTranslationKey(slot: string): TranslationKey | undefined {
  return RINK_SLOT_KEY[slot];
}
