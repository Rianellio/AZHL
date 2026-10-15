import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/server/db";
import type { GameDTO, TeamSummaryDTO } from "@azhl/types";
import type { Game, Team } from "@azhl/database";

function toTeamSummary(team: Team): TeamSummaryDTO {
  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    abbreviation: team.abbreviation,
    colors: {
      primary: team.colorPrimary,
      secondary: team.colorSecondary,
      accent: team.colorAccent,
    },
    logoUrl: team.logoUrl,
  };
}

type GameWithTeams = Game & { homeTeam: Team; awayTeam: Team };

function toGameDTO(game: GameWithTeams): GameDTO {
  return {
    id: game.id,
    seasonId: game.seasonId,
    status: game.status,
    startTime: game.startTime.toISOString(),
    startTimeConfirmed: game.startTimeConfirmed,
    venue: game.venue,
    homeTeam: toTeamSummary(game.homeTeam),
    awayTeam: toTeamSummary(game.awayTeam),
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    period: game.period,
    stage: game.stage,
    matchNumber: game.matchNumber,
    decidedBy: game.decidedBy,
    homeShootoutGoals: game.homeShootoutGoals,
    awayShootoutGoals: game.awayShootoutGoals,
    homePeriodScores: game.homePeriodScores,
    awayPeriodScores: game.awayPeriodScores,
    homeShots: game.homeShots,
    awayShots: game.awayShots,
  };
}

/** Every game in the current season, ascending by start time. Filtering (team/date) happens client-side on this set — Phase 1's schedule is small enough that a second round-trip isn't worth the complexity. */
export const getCurrentSeasonSchedule = unstable_cache(
  async (): Promise<GameDTO[]> => {
    const season = await prisma.season.findFirst({ where: { isCurrent: true } });
    if (!season) return [];

    const games = await prisma.game.findMany({
      where: { seasonId: season.id },
      orderBy: { startTime: "asc" },
      include: { homeTeam: true, awayTeam: true },
    });

    return games.map(toGameDTO);
  },
  ["schedule", "current-season"],
  { tags: ["schedule"], revalidate: 60 },
);

export const getGameById = unstable_cache(
  async (id: string): Promise<GameDTO | null> => {
    const game = await prisma.game.findUnique({
      where: { id },
      include: { homeTeam: true, awayTeam: true },
    });
    return game ? toGameDTO(game) : null;
  },
  ["game-by-id"],
  { tags: ["schedule"], revalidate: 60 },
);
