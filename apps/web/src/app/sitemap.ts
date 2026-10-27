import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";
import { getAllTeams } from "@/lib/server/services/team.service";
import { getAllPlayers } from "@/lib/server/services/player.service";
import { getCurrentSeasonSchedule } from "@/lib/server/services/schedule.service";
import { listNewsArticles } from "@/lib/server/services/news.service";

export const revalidate = 3600;

const STATIC_PATHS = [
  "/",
  "/league",
  "/teams",
  "/players",
  "/schedule",
  "/standings",
  "/stats",
  "/news",
  "/media",
  "/contacts",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [teams, players, games, articles] = await Promise.all([
    getAllTeams(),
    getAllPlayers(),
    getCurrentSeasonSchedule(),
    listNewsArticles(),
  ]);
  const url = (path: string) => new URL(path, SITE_URL).toString();

  return [
    ...STATIC_PATHS.map((path) => ({ url: url(path) })),
    ...teams.map((team) => ({ url: url(`/teams/${team.slug}`) })),
    ...players.map((player) => ({ url: url(`/players/${player.id}`) })),
    ...games.map((game) => ({ url: url(`/game/${game.id}`) })),
    ...articles.map((article) => ({
      url: url(`/news/${article.slug}`),
      lastModified: article.publishedAt,
    })),
  ];
}
