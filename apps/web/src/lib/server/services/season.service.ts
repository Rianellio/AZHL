import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/server/db";
import type { SeasonDTO } from "@azhl/types";

/** The season flagged `isCurrent`, or null before any season exists. */
export const getCurrentSeason = unstable_cache(
  async (): Promise<SeasonDTO | null> => {
    const season = await prisma.season.findFirst({
      where: { isCurrent: true },
      orderBy: { startDate: "desc" },
    });
    if (!season) return null;
    return {
      id: season.id,
      leagueId: season.leagueId,
      label: season.label,
      startDate: season.startDate.toISOString(),
      endDate: season.endDate.toISOString(),
      isCurrent: season.isCurrent,
    };
  },
  ["season", "current"],
  { tags: ["season"], revalidate: 60 },
);
