export type PlayerPosition = "C" | "LW" | "RW" | "D" | "G";

/** Minimal Phase 1 shape — full profile fields (bio, height/weight, draft info, awards) land in Phase 2. */
export interface PlayerSummaryDTO {
  id: string;
  fullName: string;
  jerseyNumber: number;
  position: PlayerPosition;
  teamId: string;
}
