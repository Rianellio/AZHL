/** MOCK DATA — see ./README.md. No goalie stat model exists yet (field names mirror the planned
 * `statistics.goalie_season_stats` table in .claude/database-erd.md §7), and no AZHL season has
 * been played. Development builds simulate a seeded season game by game so GAA and SV% are
 * derived from the same shots/goals and stay consistent; every other environment (production
 * builds, the live site) gets an all-zero line, so invented stats are never shown publicly. */
import type { PlayerSummaryDTO } from "@azhl/types";
import { seededInt, seedHash } from "./seed-hash";

export interface MockGoalieStatLine {
  gamesPlayed: number;
  wins: number;
  losses: number;
  goalsAgainstAverage: number;
  /** Fraction in [0, 1] — format for display with formatSavePercentage. */
  savePercentage: number;
  shutouts: number;
}

const ZERO_GOALIE_LINE: MockGoalieStatLine = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  goalsAgainstAverage: 0,
  savePercentage: 0,
  shutouts: 0,
};

export function getMockGoalieStats(player: Pick<PlayerSummaryDTO, "id">): MockGoalieStatLine {
  if (process.env.NODE_ENV !== "development") return ZERO_GOALIE_LINE;

  const seed = seedHash(`goalie:${player.id}`);
  // One goalie dresses per match, so the range matches a skater's (see ./player-stats.ts).
  const gamesPlayed = seededInt(seed, 7, 10);
  let shotsAgainst = 0;
  let goalsAgainst = 0;
  let wins = 0;
  let shutouts = 0;

  for (let game = 0; game < gamesPlayed; game++) {
    const gameSeed = seed + (game + 1) * 101;
    const shots = seededInt(gameSeed, 20, 38);
    const saveRate = seededInt(gameSeed + 1, 860, 975) / 1000;
    const allowed = Math.round(shots * (1 - saveRate));
    // A 0–0 game goes to a shootout the goalie's team wins, so a shutout is always a win.
    const scored = Math.max(seededInt(gameSeed + 2, 0, 6), allowed === 0 ? 1 : 0);

    shotsAgainst += shots;
    goalsAgainst += allowed;
    if (scored > allowed) wins++;
    if (allowed === 0) shutouts++;
  }

  return {
    gamesPlayed,
    wins,
    // Ties are decided in OT/shootout, so every non-win counts as a loss here.
    losses: gamesPlayed - wins,
    // Every simulated game is a full 60 minutes, so GAA = GA × 60 / minutes = GA / GP.
    goalsAgainstAverage: goalsAgainst / gamesPlayed,
    savePercentage: (shotsAgainst - goalsAgainst) / shotsAgainst,
    shutouts,
  };
}
