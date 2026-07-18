import type { TeamSummaryDTO } from "./team";

export type GameStatus = "SCHEDULED" | "LIVE" | "FINAL" | "POSTPONED";

export interface GameDTO {
  id: string;
  seasonId: string;
  status: GameStatus;
  startTime: string;
  venue: string;
  homeTeam: TeamSummaryDTO;
  awayTeam: TeamSummaryDTO;
  homeScore: number | null;
  awayScore: number | null;
  period: number | null;
}
