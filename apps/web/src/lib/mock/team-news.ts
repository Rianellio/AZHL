/** MOCK DATA — see ./README.md. NewsArticle has no team relation yet, so a team's "Latest News" section uses deterministic placeholder cards instead of a real query. */
import { seedHash, seededInt } from "./seed-hash";

export interface MockTeamNewsItem {
  title: string;
  daysAgo: number;
}

const HEADLINE_TEMPLATES = [
  "{team} extend winning streak to {n} games",
  "Inside {team}'s power play resurgence",
  "{team} sign depth forward ahead of stretch run",
  "Behind the bench: {team}'s system explained",
  "{team} fans packed the arena for the derby",
  "Prospect watch: who's next up for {team}",
];

export function getMockTeamNews(teamName: string): MockTeamNewsItem[] {
  const seed = seedHash(teamName);
  return HEADLINE_TEMPLATES.slice(0, 3).map((template, index) => ({
    title: template
      .replace("{team}", teamName)
      .replace("{n}", String(seededInt(seed + index, 3, 7))),
    daysAgo: seededInt(seed + index * 5, 1, 12) + index * 3,
  }));
}
