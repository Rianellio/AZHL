import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/server/db";
import type { TeamSummaryDTO } from "@azhl/types";
import type { Team } from "@azhl/database";

/**
 * New addition, not a modification of an existing service — same pattern as
 * player.service.ts. Needed for the real-data Teams directory and Team Detail pages.
 */

function toTeamSummary(team: Team): TeamSummaryDTO {
  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    abbreviation: team.abbreviation,
    colors: { primary: team.colorPrimary, secondary: team.colorSecondary, accent: team.colorAccent },
    logoUrl: team.logoUrl,
  };
}

export interface TeamDTO extends TeamSummaryDTO {
  city: string;
}

function toTeamDTO(team: Team): TeamDTO {
  return { ...toTeamSummary(team), city: team.city };
}

export const getAllTeams = unstable_cache(
  async (): Promise<TeamDTO[]> => {
    const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });
    return teams.map(toTeamDTO);
  },
  ["teams", "all"],
  { tags: ["teams"], revalidate: 60 },
);

export const getTeamBySlug = unstable_cache(
  async (slug: string): Promise<TeamDTO | null> => {
    const team = await prisma.team.findUnique({ where: { slug } });
    return team ? toTeamDTO(team) : null;
  },
  ["teams", "by-slug"],
  { tags: ["teams"], revalidate: 60 },
);
