/** MOCK DATA — see ./README.md. No PlayerStat model exists yet (field names mirror the planned
 * `statistics.player_season_stats` table in .claude/database-erd.md §7), and no AZHL season has
 * been played. Realistic seeded lines are generated in development only so the stats UI can be
 * built against real-looking numbers; every other environment (production builds, the live
 * site) gets an all-zero line, so invented stats are never shown publicly. */
import type { PlayerSummaryDTO } from "@azhl/types";
import { seededInt, seedHash } from "./seed-hash";

export interface MockPlayerStatLine {
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  penaltyMinutes: number;
}

const ZERO_STAT_LINE: MockPlayerStatLine = {
  gamesPlayed: 0,
  goals: 0,
  assists: 0,
  points: 0,
  penaltyMinutes: 0,
};

/** Per-game rates in hundredths, roughly a ~10-game amateur-league season: forwards score
 * noticeably more than defensemen, who in turn take a few more penalty minutes. */
type Range = [min: number, max: number];
type SkaterProfile = Record<"goalRate" | "assistRate" | "minorPenalties", Range>;

const SKATER_PROFILES: Record<"forward" | "defense", SkaterProfile> = {
  forward: { goalRate: [12, 55], assistRate: [15, 65], minorPenalties: [0, 5] },
  defense: { goalRate: [2, 18], assistRate: [10, 45], minorPenalties: [0, 7] },
};

export function getMockPlayerStats(player: Pick<PlayerSummaryDTO, "id" | "position">): MockPlayerStatLine {
  // Goalies are tracked on their own line — see ./goalie-stats.ts.
  if (process.env.NODE_ENV !== "development" || player.position === "G") return ZERO_STAT_LINE;

  const seed = seedHash(`skater:${player.id}`);
  const profile = player.position === "D" ? SKATER_PROFILES.defense : SKATER_PROFILES.forward;
  const gamesPlayed = seededInt(seed, 7, 10);
  const goals = Math.round((gamesPlayed * seededInt(seed + 1, ...profile.goalRate)) / 100);
  const assists = Math.round((gamesPlayed * seededInt(seed + 2, ...profile.assistRate)) / 100);

  return {
    gamesPlayed,
    goals,
    assists,
    points: goals + assists,
    penaltyMinutes: 2 * seededInt(seed + 3, ...profile.minorPenalties),
  };
}

/** Used for Home's "Top Players" widget. Sorted by points (stable, so ties keep roster order);
 * outside development every line is zero, so this is just roster order. */
export function rankPlayersByMockPoints<T extends Pick<PlayerSummaryDTO, "id" | "position">>(
  players: T[],
): (T & { stats: MockPlayerStatLine })[] {
  return players
    .map((player) => ({ ...player, stats: getMockPlayerStats(player) }))
    .sort((a, b) => b.stats.points - a.stats.points);
}
