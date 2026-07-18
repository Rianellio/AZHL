import type { TeamSummaryDTO } from "./team";

export interface StandingDTO {
  team: TeamSummaryDTO;
  seasonId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  streak: string;
  rank: number;
}
