import type { TeamSummaryDTO } from "./team";

export type GameStatus = "SCHEDULED" | "LIVE" | "FINAL" | "POSTPONED";

export type GameStage = "REGULAR_SEASON" | "PLAYOFF";

/** No overtime in AZHL — a game tied after regulation is decided by a shootout. */
export type GameDecision = "REGULATION" | "SHOOTOUT";

export interface GameDTO {
  id: string;
  seasonId: string;
  status: GameStatus;
  startTime: string;
  /** False until the league announces a face-off time; show the date with "Time TBA" instead. */
  startTimeConfirmed: boolean;
  venue: string;
  homeTeam: TeamSummaryDTO;
  awayTeam: TeamSummaryDTO;
  homeScore: number | null;
  awayScore: number | null;
  period: number | null;
  stage: GameStage;
  matchNumber: number | null;
  decidedBy: GameDecision | null;
  homeShootoutGoals: number | null;
  awayShootoutGoals: number | null;
  homePeriodScores: number[];
  awayPeriodScores: number[];
  homeShots: number | null;
  awayShots: number | null;
}
