import Link from "next/link";
import { getCurrentSeasonStandings } from "@/lib/server/services/standings.service";
import { getCurrentSeasonSchedule } from "@/lib/server/services/schedule.service";
import { listNewsArticles } from "@/lib/server/services/news.service";
import { ScoreCard } from "@/components/league/score-card";
import { ArticleCard } from "@/components/league/article-card";
import { StandingsTable } from "@/components/league/standings-table";
import { Button } from "@azhl/ui";

export const revalidate = 60;

export default async function HomePage() {
  const [standings, schedule, articles] = await Promise.all([
    getCurrentSeasonStandings(),
    getCurrentSeasonSchedule(),
    listNewsArticles(),
  ]);

  const now = Date.now();
  const featuredGames = [...schedule]
    .sort((a, b) => {
      const aLive = a.status === "LIVE" ? 0 : 1;
      const bLive = b.status === "LIVE" ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      return Math.abs(new Date(a.startTime).getTime() - now) - Math.abs(new Date(b.startTime).getTime() - now);
    })
    .slice(0, 3);

  const topStandings = standings.slice(0, 6);
  const latestArticles = articles.slice(0, 3);

  return (
    <div className="flex flex-col gap-20 pb-24">
      <section className="border-b border-border-subtle bg-gradient-to-b from-surface-raised/40 to-surface-base">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-24">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
            2025&ndash;26 Season
          </p>
          <h1 className="max-w-3xl font-display text-5xl font-bold tracking-tight text-foreground-primary sm:text-6xl">
            The Arctic Zone Hockey League.
          </h1>
          <p className="max-w-xl text-lg text-foreground-secondary">
            Standings, schedule, scores, and news &mdash; built for speed and built for the ice.
          </p>
          <div className="flex gap-4">
            <Button asChild>
              <Link href="/standings">View Standings</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/schedule">Full Schedule</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-foreground-primary">Games</h2>
          <Link href="/schedule" className="text-sm font-medium text-accent hover:underline">
            Full schedule
          </Link>
        </div>
        {featuredGames.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredGames.map((game) => (
              <ScoreCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground-secondary">No games scheduled yet.</p>
        )}
      </section>

      <section className="mx-auto w-full max-w-6xl px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-foreground-primary">Standings</h2>
          <Link href="/standings" className="text-sm font-medium text-accent hover:underline">
            Full standings
          </Link>
        </div>
        <StandingsTable standings={topStandings} />
      </section>

      <section className="mx-auto w-full max-w-6xl px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-foreground-primary">Latest News</h2>
          <Link href="/news" className="text-sm font-medium text-accent hover:underline">
            All news
          </Link>
        </div>
        {latestArticles.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latestArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground-secondary">No articles published yet.</p>
        )}
      </section>
    </div>
  );
}
