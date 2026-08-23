import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/server/db";
import type { PlayerSummaryDTO, TeamSummaryDTO } from "@azhl/types";
import type { Player, Team } from "@azhl/database";

/**
 * New addition, not a modification of an existing service — follows the exact pattern of
 * standings/schedule/news.service.ts (unstable_cache + real Prisma reads). Needed because the
 * approved redesign requires real player data for Players/Player Detail/Team roster/Home's
 * "Top Players" — none of the three existing services expose an all-players query.
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

export interface PlayerWithTeamDTO extends PlayerSummaryDTO {
  team: TeamSummaryDTO;
}

function toPlayerWithTeamDTO(player: Player & { team: Team }): PlayerWithTeamDTO {
  return {
    id: player.id,
    fullName: player.fullName,
    jerseyNumber: player.jerseyNumber,
    position: player.position,
    teamId: player.teamId,
    team: toTeamSummary(player.team),
  };
}

export const getAllPlayers = unstable_cache(
  async (): Promise<PlayerWithTeamDTO[]> => {
    const players = await prisma.player.findMany({
      include: { team: true },
      orderBy: [{ team: { name: "asc" } }, { jerseyNumber: "asc" }],
    });
    return players.map(toPlayerWithTeamDTO);
  },
  ["players", "all"],
  { tags: ["players"], revalidate: 60 },
);

export const getPlayerById = unstable_cache(
  async (id: string): Promise<PlayerWithTeamDTO | null> => {
    const player = await prisma.player.findUnique({ where: { id }, include: { team: true } });
    return player ? toPlayerWithTeamDTO(player) : null;
  },
  ["players", "by-id"],
  { tags: ["players"], revalidate: 60 },
);

export const getPlayersByTeamId = unstable_cache(
  async (teamId: string): Promise<PlayerWithTeamDTO[]> => {
    const players = await prisma.player.findMany({
      where: { teamId },
      include: { team: true },
      orderBy: { jerseyNumber: "asc" },
    });
    return players.map(toPlayerWithTeamDTO);
  },
  ["players", "by-team"],
  { tags: ["players"], revalidate: 60 },
);
