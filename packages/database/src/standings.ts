import type { PrismaClient } from "@prisma/client";

/**
 * AZHL standings rules, per the official 2026/27 regulation. The single implementation shared by
 * the seed and (later) the admin's "game finalized" flow — never re-derive these elsewhere.
 *
 * - No overtime: a game tied after 3 periods goes to a shootout.
 * - Points: regulation win 2, shootout win 2, shootout loss 1, regulation loss 0.
 * - The shootout winner's final score gets exactly SHOOTOUT_WINNER_GOAL_BONUS added (2:2 after
 *   regulation is recorded as 3:2 SO), and that goal counts toward GF/GA/goal difference.
 *   homeScore/awayScore always store this official final score.
 * - A forfeit (technical result) is stored as a FINAL, REGULATION game scored FORFEIT_SCORE.
 */
export const POINTS = {
  REGULATION_WIN: 2,
  SHOOTOUT_WIN: 2,
  SHOOTOUT_LOSS: 1,
  REGULATION_LOSS: 0,
} as const;

export const SHOOTOUT_WINNER_GOAL_BONUS = 1;

export const FORFEIT_SCORE = { winner: 3, loser: 0 } as const;

export interface StandingsGame {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  decidedBy: "REGULATION" | "SHOOTOUT";
}

export interface ComputedStanding {
  teamId: string;
  rank: number;
  gamesPlayed: number;
  /** Regulation wins only. */
  wins: number;
  /** Regulation losses only. */
  losses: number;
  shootoutWins: number;
  shootoutLosses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
}

type Tally = Omit<ComputedStanding, "rank">;

function emptyTally(teamId: string): Tally {
  return {
    teamId,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    shootoutWins: 0,
    shootoutLosses: 0,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  };
}

function assertValidResult(game: StandingsGame): void {
  const margin = Math.abs(game.homeScore - game.awayScore);
  if (game.decidedBy === "SHOOTOUT" && margin !== SHOOTOUT_WINNER_GOAL_BONUS) {
    throw new Error(
      `Game ${game.id}: a shootout result must differ by exactly ${SHOOTOUT_WINNER_GOAL_BONUS} goal (got ${game.homeScore}:${game.awayScore}).`,
    );
  }
  if (game.decidedBy === "REGULATION" && margin === 0) {
    throw new Error(`Game ${game.id}: a regulation result can't be a tie (got ${game.homeScore}:${game.awayScore}).`);
  }
}

/** Builds a table over `teamIds` from the subset of `games` played between two of those teams. */
function tallyGames(teamIds: readonly string[], games: readonly StandingsGame[]): Map<string, Tally> {
  const table = new Map(teamIds.map((id) => [id, emptyTally(id)]));

  for (const game of games) {
    const home = table.get(game.homeTeamId);
    const away = table.get(game.awayTeamId);
    if (!home || !away) continue;

    home.gamesPlayed++;
    away.gamesPlayed++;
    home.goalsFor += game.homeScore;
    home.goalsAgainst += game.awayScore;
    away.goalsFor += game.awayScore;
    away.goalsAgainst += game.homeScore;

    const [winner, loser] = game.homeScore > game.awayScore ? [home, away] : [away, home];
    if (game.decidedBy === "SHOOTOUT") {
      winner.shootoutWins++;
      winner.points += POINTS.SHOOTOUT_WIN;
      loser.shootoutLosses++;
      loser.points += POINTS.SHOOTOUT_LOSS;
    } else {
      winner.wins++;
      winner.points += POINTS.REGULATION_WIN;
      loser.losses++;
      loser.points += POINTS.REGULATION_LOSS;
    }
  }

  return table;
}

const goalDiff = (t: Tally) => t.goalsFor - t.goalsAgainst;

/** Splits `ids` (already tied) into ordered groups of equal `value`, highest first. */
function splitBy(ids: string[], value: (id: string) => number): string[][] {
  const groups = new Map<number, string[]>();
  for (const id of ids) {
    const v = value(id);
    groups.set(v, [...(groups.get(v) ?? []), id]);
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]).map(([, group]) => group);
}

/**
 * Orders a group of teams level on points, applying the regulation's tiebreakers in order:
 * head-to-head points → head-to-head goal difference → overall goal difference → goals scored →
 * total wins (regulation + shootout) → lottery. Whenever a head-to-head criterion splits the
 * group, the head-to-head chain restarts for each still-tied subgroup with a mini-table of only
 * that subgroup's games.
 */
function breakTie(
  tied: string[],
  overall: Map<string, Tally>,
  games: readonly StandingsGame[],
  teamNames: ReadonlyMap<string, string>,
): string[] {
  if (tied.length <= 1) return tied;

  const headToHead = tallyGames(tied, games);
  for (const criterion of [
    (id: string) => headToHead.get(id)!.points,
    (id: string) => goalDiff(headToHead.get(id)!),
  ]) {
    const groups = splitBy(tied, criterion);
    if (groups.length > 1) return groups.flatMap((group) => breakTie(group, overall, games, teamNames));
  }

  return breakTieOverall(tied, overall, teamNames);
}

function breakTieOverall(
  tied: string[],
  overall: Map<string, Tally>,
  teamNames: ReadonlyMap<string, string>,
): string[] {
  const criteria = [
    (id: string) => goalDiff(overall.get(id)!),
    (id: string) => overall.get(id)!.goalsFor,
    (id: string) => overall.get(id)!.wins + overall.get(id)!.shootoutWins,
  ];
  let groups = [tied];
  for (const criterion of criteria) {
    groups = groups.flatMap((group) => (group.length > 1 ? splitBy(group, criterion) : [group]));
  }
  // TODO: the regulation's final tiebreaker is a lottery drawn by the league. Until there's a way
  // to record that draw, fall back to a stable alphabetical order so ranks never flicker.
  return groups.flatMap((group) =>
    [...group].sort((a, b) => (teamNames.get(a) ?? a).localeCompare(teamNames.get(b) ?? b)),
  );
}

/**
 * Pure standings computation. `games` must be FINAL regular-season games only (playoff games
 * never count toward standings). `teamNames` only feeds the lottery fallback ordering.
 */
export function computeStandings(
  teamIds: readonly string[],
  games: readonly StandingsGame[],
  teamNames: ReadonlyMap<string, string> = new Map(),
): ComputedStanding[] {
  games.forEach(assertValidResult);
  const overall = tallyGames(teamIds, games);

  const byPoints = splitBy([...teamIds], (id) => overall.get(id)!.points);
  const ordered = byPoints.flatMap((group) => breakTie(group, overall, games, teamNames));

  return ordered.map((teamId, index) => ({ ...overall.get(teamId)!, rank: index + 1 }));
}

/**
 * Recomputes and persists the materialized Standing rows for a season from its FINAL
 * REGULAR_SEASON games. Every team that appears in the season's schedule (or already has a
 * standing row) gets a row, so the table is complete before the first game is played.
 */
export async function recomputeStandings(seasonId: string, client: PrismaClient): Promise<ComputedStanding[]> {
  const [allGames, existing] = await Promise.all([
    client.game.findMany({
      where: { seasonId },
      select: {
        id: true,
        status: true,
        stage: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        decidedBy: true,
      },
    }),
    client.standing.findMany({ where: { seasonId }, select: { teamId: true } }),
  ]);

  const teamIds = [
    ...new Set([...allGames.flatMap((g) => [g.homeTeamId, g.awayTeamId]), ...existing.map((s) => s.teamId)]),
  ];
  const teams = await client.team.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true } });

  const finals: StandingsGame[] = [];
  for (const game of allGames) {
    if (game.status !== "FINAL" || game.stage !== "REGULAR_SEASON") continue;
    if (game.homeScore === null || game.awayScore === null || game.decidedBy === null) {
      throw new Error(`Game ${game.id} is FINAL but is missing its score or decidedBy.`);
    }
    finals.push({ ...game, homeScore: game.homeScore, awayScore: game.awayScore, decidedBy: game.decidedBy });
  }

  const standings = computeStandings(teamIds, finals, new Map(teams.map((t) => [t.id, t.name])));

  await client.$transaction(
    standings.map(({ teamId, ...stats }) =>
      client.standing.upsert({
        where: { seasonId_teamId: { seasonId, teamId } },
        update: stats,
        create: { seasonId, teamId, ...stats },
      }),
    ),
  );

  return standings;
}
