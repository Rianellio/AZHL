/** No PlayerStat model exists yet, and no AZHL season has been played — every stat line is zero until a real season generates real results. */
import type { PlayerSummaryDTO } from "@azhl/types";

export interface MockPlayerStatLine {
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
}

const ZERO_STAT_LINE: MockPlayerStatLine = { gamesPlayed: 0, goals: 0, assists: 0, points: 0 };

export function getMockPlayerStats(_player: Pick<PlayerSummaryDTO, "id" | "position">): MockPlayerStatLine {
  return ZERO_STAT_LINE;
}

/** Used for Home's "Top Players" widget. All stats are zero pre-season, so this preserves roster order rather than implying a real ranking. */
export function rankPlayersByMockPoints<T extends Pick<PlayerSummaryDTO, "id" | "position">>(
  players: T[],
): (T & { stats: MockPlayerStatLine })[] {
  return players.map((player) => ({ ...player, stats: getMockPlayerStats(player) }));
}
