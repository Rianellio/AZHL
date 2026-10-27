import type { TeamSummaryDTO } from "./team";

export interface StandingDTO {
  team: TeamSummaryDTO;
  seasonId: string;
  gamesPlayed: number;
  /** Regulation wins only. */
  wins: number;
  /** Regulation losses only — GP = wins + shootoutWins + shootoutLosses + losses. */
  losses: number;
  shootoutWins: number;
  shootoutLosses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  streak: string;
  rank: number;
}
