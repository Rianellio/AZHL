import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { User } from "lucide-react";
import { getPlayerById } from "@/lib/server/services/player.service";
import { getCurrentSeasonSchedule } from "@/lib/server/services/schedule.service";
import { getMockPlayerStats } from "@/lib/mock/player-stats";
import { getMockGoalieStats } from "@/lib/mock/goalie-stats";
import { formatCount, formatGoalsAgainstAverage, formatSavePercentage } from "@/lib/stat-format";
import { getMockPlayerBio } from "@/lib/mock/player-bio";
import { getMockTeamNews } from "@/lib/mock/team-news";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { StatTile } from "@/components/league/stat-tile";
import { SectionHeader } from "@/components/league/section-header";
import { EmptyState } from "@/components/league/empty-state";
import { GameDate } from "@/components/league/game-date";
import { T } from "@/components/ui/t";
import { positionTranslationKey } from "@/lib/i18n/position-key";
import { Card, CardContent } from "@/components/ui/card";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const player = await getPlayerById(id);
  return { title: player ? player.fullName : "Player not found" };
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const player = await getPlayerById(id);
  if (!player) notFound();

  const schedule = await getCurrentSeasonSchedule();

  const seasonStats = getMockPlayerStats(player);
  const goalieStats = player.position === "G" ? getMockGoalieStats(player) : null;
  const bio = getMockPlayerBio(player.id, player.team.name);
  const relatedNews = getMockTeamNews(player.team.name).slice(0, 2);
  const posKey = positionTranslationKey(player.position);

  const recentTeamGames = schedule
    .filter(
      (g) => (g.homeTeam.id === player.teamId || g.awayTeam.id === player.teamId) && g.status === "FINAL",
    )
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      {/* Portrait + identity */}
      <div className="mb-14 grid grid-cols-1 gap-8 sm:grid-cols-[220px_1fr]">
        <ImagePlaceholder
          ratio="aspect-[3/4]"
          className="w-full max-w-[220px] border border-border-subtle"
          icon={<User className="h-16 w-16 text-foreground-tertiary" strokeWidth={1} />}
        />
        <div className="flex flex-col justify-end gap-3">
          <Link
            href={`/teams/${player.team.slug}`}
            className="w-fit text-xs font-semibold uppercase tracking-wide text-accent hover:text-accent-hover"
          >
            {player.team.name}
          </Link>
          <h1 className="font-display text-5xl font-bold uppercase leading-none text-foreground-primary">
            {player.fullName}
          </h1>
          <p className="text-sm font-medium uppercase tracking-wide text-foreground-secondary">
            #{player.jerseyNumber} &middot; {posKey ? <T k={posKey} /> : player.position} &middot;{" "}
            {bio.hometown}, <T k="playerDetail.countrySuffix" />
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-14">
        {/* Biography */}
        <section>
          <SectionHeader titleKey="playerDetail.biography" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm leading-relaxed text-foreground-secondary">{bio.bio}</p>
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
              <StatTile labelKey="playerDetail.age" value={bio.age} />
              <StatTile labelKey="playerDetail.height" value={`${bio.heightCm} cm`} />
              <StatTile labelKey="playerDetail.weight" value={`${bio.weightKg} kg`} />
              <StatTile labelKey="playerDetail.hometown" value={bio.hometown} />
            </div>
          </div>
        </section>

        {/* Season stats */}
        <section>
          <SectionHeader titleKey="playerDetail.seasonStatistics" />
          {goalieStats ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <StatTile labelKey="standings.colGP" value={goalieStats.gamesPlayed} />
              <StatTile labelKey="playerDetail.wins" value={formatCount(goalieStats.wins, goalieStats.gamesPlayed)} />
              <StatTile labelKey="playerDetail.losses" value={formatCount(goalieStats.losses, goalieStats.gamesPlayed)} />
              <StatTile
                labelKey="playerDetail.goalsAgainstAverage"
                value={formatGoalsAgainstAverage(goalieStats.goalsAgainstAverage, goalieStats.gamesPlayed)}
              />
              <StatTile
                labelKey="playerDetail.savePercentage"
                value={formatSavePercentage(goalieStats.savePercentage, goalieStats.gamesPlayed)}
              />
              <StatTile labelKey="playerDetail.shutouts" value={formatCount(goalieStats.shutouts, goalieStats.gamesPlayed)} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <StatTile labelKey="standings.colGP" value={seasonStats.gamesPlayed} />
              <StatTile labelKey="playerDetail.goals" value={formatCount(seasonStats.goals, seasonStats.gamesPlayed)} />
              <StatTile labelKey="playerDetail.assists" value={formatCount(seasonStats.assists, seasonStats.gamesPlayed)} />
              <StatTile labelKey="playerDetail.points" value={formatCount(seasonStats.points, seasonStats.gamesPlayed)} />
              <StatTile
                labelKey="playerDetail.penaltyMinutes"
                value={formatCount(seasonStats.penaltyMinutes, seasonStats.gamesPlayed)}
              />
            </div>
          )}
        </section>

        {/* Career stats */}
        <section>
          <SectionHeader titleKey="playerDetail.careerStatistics" />
          {bio.careerSeasons.length > 0 ? (
            <div className="w-full overflow-x-auto border border-border-subtle">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-surface-overlay text-foreground-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                      <T k="playerDetail.colSeason" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                      <T k="playerDetail.colTeam" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                      <T k="standings.colGP" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                      <T k="playerDetail.colG" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                      <T k="playerDetail.colA" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                      <T k="playerDetail.colPts" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {bio.careerSeasons.map((row) => (
                    <tr key={row.season}>
                      <td className="px-4 py-3 font-medium text-foreground-primary">{row.season}</td>
                      <td className="px-4 py-3 text-foreground-secondary">{row.team}</td>
                      <td className="px-4 py-3">{row.stats.gamesPlayed}</td>
                      <td className="px-4 py-3">{row.stats.goals}</td>
                      <td className="px-4 py-3">{row.stats.assists}</td>
                      <td className="px-4 py-3 font-semibold text-foreground-primary">{row.stats.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState textKey="playerDetail.noPriorSeasons" />
          )}
        </section>

        {/* Achievements */}
        <section>
          <SectionHeader titleKey="playerDetail.achievements" />
          {bio.achievements.length > 0 ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {bio.achievements.map((achievement) => (
                <li
                  key={achievement.label}
                  className="border border-border-subtle bg-surface-raised px-4 py-3 text-sm font-medium text-foreground-primary"
                >
                  {achievement.label}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState textKey="playerDetail.noAchievements" />
          )}
        </section>

        {/* Recent games */}
        <section>
          <SectionHeader titleKey="playerDetail.recentGames" />
          {recentTeamGames.length > 0 ? (
            <div className="w-full overflow-x-auto border border-border-subtle">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-surface-overlay text-foreground-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                      <T k="playerDetail.colDate" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                      <T k="playerDetail.colOpponent" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                      <T k="playerDetail.colResult" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                      <T k="playerDetail.colG" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                      <T k="playerDetail.colA" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {recentTeamGames.map((game) => {
                    const isHome = game.homeTeam.id === player.teamId;
                    const opponent = isHome ? game.awayTeam : game.homeTeam;
                    return (
                      <tr key={game.id}>
                        <td className="px-4 py-3 text-foreground-secondary">
                          <GameDate iso={game.startTime} />
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground-primary">
                          {isHome ? "vs" : "@"} {opponent.name}
                        </td>
                        <td className="px-4 py-3">
                          {game.homeScore} – {game.awayScore}
                        </td>
                        <td className="px-4 py-3">0</td>
                        <td className="px-4 py-3">0</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState textKey="playerDetail.noGamesPlayed" />
          )}
        </section>

        {/* Related news */}
        <section>
          <SectionHeader titleKey="playerDetail.relatedNews" action={{ labelKey: "playerDetail.allNews", href: "/news" }} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {relatedNews.map((item) => (
              <Card key={item.title}>
                <CardContent className="flex flex-col gap-2 p-5">
                  <span className="text-xs font-medium uppercase tracking-wide text-foreground-secondary">
                    {item.daysAgo === 1 ? (
                      <T k="playerDetail.dayAgo" />
                    ) : (
                      <T k="playerDetail.daysAgo" vars={{ n: item.daysAgo }} />
                    )}
                  </span>
                  <p className="font-display text-base font-semibold leading-snug text-foreground-primary">
                    {item.title}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
