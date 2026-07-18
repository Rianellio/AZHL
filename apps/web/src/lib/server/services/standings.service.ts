import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/server/db";
import type { StandingDTO, TeamSummaryDTO } from "@azhl/types";
import type { Standing, Team } from "@azhl/database";

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

function toStandingDTO(standing: Standing & { team: Team }): StandingDTO {
  return {
    team: toTeamSummary(standing.team),
    seasonId: standing.seasonId,
    gamesPlayed: standing.gamesPlayed,
    wins: standing.wins,
    losses: standing.losses,
    otLosses: standing.otLosses,
    points: standing.points,
    goalsFor: standing.goalsFor,
    goalsAgainst: standing.goalsAgainst,
    streak: standing.streak,
    rank: standing.rank,
  };
}

/**
 * Standings are derived data (see packages/database/prisma/seed.ts and
 * .claude/database-guidelines.md) — this service only reads the materialized Standing table,
 * it never recomputes from Game results itself.
 */
export const getCurrentSeasonStandings = unstable_cache(
  async (): Promise<StandingDTO[]> => {
    const season = await prisma.season.findFirst({ where: { isCurrent: true } });
    if (!season) return [];

    const standings = await prisma.standing.findMany({
      where: { seasonId: season.id },
      orderBy: { rank: "asc" },
      include: { team: true },
    });

    return standings.map(toStandingDTO);
  },
  ["standings", "current-season"],
  { tags: ["standings"], revalidate: 60 },
);
