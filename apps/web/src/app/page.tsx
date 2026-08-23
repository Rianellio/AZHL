import { getCurrentSeasonStandings } from "@/lib/server/services/standings.service";
import { getCurrentSeasonSchedule } from "@/lib/server/services/schedule.service";
import { listNewsArticles } from "@/lib/server/services/news.service";
import { getAllPlayers } from "@/lib/server/services/player.service";
import { rankPlayersByMockPoints } from "@/lib/mock/player-stats";
import { Hero } from "@/components/league/hero";
import { SectionHeader } from "@/components/league/section-header";
import { NextGameRow } from "@/components/league/next-game-row";
import { StandingsWidget } from "@/components/league/standings-widget";
import { TopPlayerRow } from "@/components/league/top-player-row";
import { ArticleCard } from "@/components/league/article-card";
import { PartnersStrip } from "@/components/league/partners-strip";
import { EmptyState } from "@/components/league/empty-state";

export const revalidate = 60;

export default async function HomePage() {
  const [standings, schedule, articles, players] = await Promise.all([
    getCurrentSeasonStandings(),
    getCurrentSeasonSchedule(),
    listNewsArticles(),
    getAllPlayers(),
  ]);

  const nextGames = [...schedule]
    .filter((game) => game.status !== "FINAL")
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 3);

  const topStandings = standings.slice(0, 4);
  // No PlayerStat model exists yet, so every player's stat line is zero (see
  // lib/mock/player-stats.ts) — ranking arbitrary players by a stat that's always 0 would
  // present a fake leaderboard. Only players with a genuinely nonzero point total qualify,
  // exactly like the /stats page's leaderboards already do; this starts populating itself
  // automatically once real stats exist, no further code change needed.
  const topPlayers = rankPlayersByMockPoints(players)
    .filter(({ stats }) => stats.points > 0)
    .slice(0, 3);
  const latestArticles = articles.slice(0, 4);

  const seasonYear = new Date().getFullYear();
  const seasonYearRange = `${seasonYear}-${seasonYear + 1}`;

  return (
    <div className="flex flex-col">
      <Hero
        seasonYearRange={seasonYearRange}
        titleLines={["Azerbaijan", "Hockey League"]}
        taglineKey="home.heroTagline"
        cta={{ labelKey: "nav.join", href: "/contacts" }}
      />

      <section className="mx-auto w-full max-w-7xl px-6 py-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <SectionHeader titleKey="home.nextGames" action={{ labelKey: "common.viewAll", href: "/schedule" }} />
            <div className="flex flex-col gap-3">
              {nextGames.length > 0 ? (
                nextGames.map((game) => <NextGameRow key={game.id} game={game} />)
              ) : (
                <EmptyState textKey="home.noUpcomingGames" />
              )}
            </div>
          </div>

          <div>
            <SectionHeader
              titleKey="home.standings"
              action={{ labelKey: "common.viewFullTable", href: "/standings" }}
            />
            <StandingsWidget standings={topStandings} />
          </div>

          <div>
            <SectionHeader titleKey="home.topPlayers" action={{ labelKey: "common.viewAll", href: "/stats" }} />
            <div className="flex flex-col gap-3">
              {topPlayers.length > 0 ? (
                topPlayers.map(({ stats, ...player }) => (
                  <TopPlayerRow key={player.id} player={player} stats={stats} />
                ))
              ) : (
                <EmptyState textKey="home.noTopPlayers" />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-14">
        <SectionHeader titleKey="home.latestNews" action={{ labelKey: "common.viewAll", href: "/news" }} />
        {latestArticles.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {latestArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <EmptyState textKey="home.noArticles" />
        )}
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-16">
        <SectionHeader titleKey="home.partners" />
        <PartnersStrip />
      </section>
    </div>
  );
}
