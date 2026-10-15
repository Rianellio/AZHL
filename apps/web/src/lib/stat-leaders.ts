import type { PlayerWithTeamDTO } from "@/lib/server/services/player.service";
import type { LeaderboardEntry } from "@/components/league/stat-leaderboard-card";
import { getMockPlayerStats } from "@/lib/mock/player-stats";
import { getMockGoalieStats } from "@/lib/mock/goalie-stats";
import { positionTranslationKey } from "@/lib/i18n/position-key";
import { formatSavePercentage } from "@/lib/stat-format";

/** Leaderboard builders shared by /stats and the team page. Both only ever return entries for
 * players with a nonzero value — with no season played, every caller resolves to an empty list
 * outside development, and starts populating itself the moment real stats exist, with no code
 * change needed. */
export function topSkatersBy(
  skaters: PlayerWithTeamDTO[],
  statKey: "goals" | "assists" | "points",
  limit = 5,
): LeaderboardEntry[] {
  return skaters
    .map((player) => ({ player, stats: getMockPlayerStats(player) }))
    .filter(({ stats }) => stats[statKey] > 0)
    .sort((a, b) => b.stats[statKey] - a.stats[statKey])
    .slice(0, limit)
    .map(({ player, stats }) => ({
      id: player.id,
      teamSlug: player.team.slug,
      teamName: player.team.name,
      primary: player.fullName,
      positionKey: positionTranslationKey(player.position),
      value: String(stats[statKey]),
    }));
}

const GOALIE_VALUE_FORMAT = {
  wins: (value: number) => String(value),
  savePercentage: (value: number, gamesPlayed: number) => formatSavePercentage(value, gamesPlayed),
} as const;

export function topGoaliesBy(
  goalies: PlayerWithTeamDTO[],
  statKey: "wins" | "savePercentage",
  limit = 5,
): LeaderboardEntry[] {
  return goalies
    .map((player) => ({ player, stats: getMockGoalieStats(player) }))
    .filter(({ stats }) => stats[statKey] > 0)
    .sort((a, b) => b.stats[statKey] - a.stats[statKey])
    .slice(0, limit)
    .map(({ player, stats }) => ({
      id: player.id,
      teamSlug: player.team.slug,
      teamName: player.team.name,
      primary: player.fullName,
      secondaryTeamName: player.team.name,
      value: GOALIE_VALUE_FORMAT[statKey](stats[statKey], stats.gamesPlayed),
    }));
}
