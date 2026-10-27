import type { Metadata } from "next";
import { serverT } from "@/lib/i18n/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { User } from "lucide-react";
import { getPlayerById } from "@/lib/server/services/player.service";
import { getCurrentSeasonSchedule } from "@/lib/server/services/schedule.service";
import { getMockPlayerStats } from "@/lib/mock/player-stats";
import { getMockGoalieStats } from "@/lib/mock/goalie-stats";
import { getMockPlayerBio } from "@/lib/mock/player-bio";
import { formatCount, formatGoalsAgainstAverage, formatSavePercentage } from "@/lib/stat-format";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { StatTile } from "@/components/league/stat-tile";
import { SectionHeader } from "@/components/league/section-header";
import { EmptyState } from "@/components/league/empty-state";
import { GameDate } from "@/components/league/game-date";
import { T } from "@/components/ui/t";
import { positionTranslationKey } from "@/lib/i18n/position-key";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const player = await getPlayerById(id);
  return { title: player ? player.fullName : serverT("notFound.title") };
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

  const bio = getMockPlayerBio(player);
  const seasonStats = getMockPlayerStats(player);
  const goalieStats = player.position === "G" ? getMockGoalieStats(player) : null;
  const posKey = positionTranslationKey(player.position);

  const recentTeamGames = schedule
    .filter(
      (g) => (g.homeTeam.id === player.teamId || g.awayTeam.id === player.teamId) && g.status === "FINAL",
    )
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      {/* Portrait + Identity + Flashscore Bio */}
      <div className="mb-14 grid grid-cols-1 gap-8 sm:grid-cols-[220px_1fr]">
        <ImagePlaceholder
          ratio="aspect-[3/4]"
          className="w-full max-w-[220px] border border-border-subtle"
          icon={<User className="h-16 w-16 text-foreground-tertiary" strokeWidth={1} />}
        />
        <div className="flex flex-col justify-end gap-3">
          <div className="flex items-center gap-2">
            <Link
              href={`/teams/${player.team.slug}`}
              className="w-fit text-xs font-semibold uppercase tracking-wide text-accent hover:text-accent-hover"
            >
              {player.team.name}
            </Link>
            {bio.category === "junior" && (
              <span className="rounded border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                <T k="playerDetail.badgeJunior" />
              </span>
            )}
            {bio.category === "veteran" && (
              <span className="rounded border border-border-subtle bg-surface-raised px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground-secondary">
                <T k="playerDetail.badgeVeteran" />
              </span>
            )}
          </div>

          <h1 className="font-display text-5xl font-bold uppercase leading-none text-foreground-primary">
            {player.fullName}
          </h1>

          <p className="text-sm font-medium uppercase tracking-wide text-foreground-secondary">
            #{player.jerseyNumber} &middot; {posKey ? <T k={posKey} /> : player.position}
          </p>

          {/* Flashscore Bio Grid */}
          <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border-subtle pt-4 sm:grid-cols-4 sm:gap-4">
            <div className="flex flex-col">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-foreground-secondary">
                <T k="playerDetail.bioAge" />
              </dt>
              <dd className="font-display text-base font-semibold text-foreground-primary">
                {bio.age}{" "}
                <span className="text-xs font-normal text-foreground-tertiary">({bio.birthDate})</span>
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-foreground-secondary">
                <T k="playerDetail.bioPhysical" />
              </dt>
              <dd className="font-display text-base font-semibold text-foreground-primary">
                {bio.heightCm} см / {bio.weightKg} кг
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-foreground-secondary">
                <T k="playerDetail.bioShoots" />
              </dt>
              <dd className="font-display text-base font-semibold text-foreground-primary">
                <T k={bio.shoots === "L" ? "playerDetail.shootsLeft" : "playerDetail.shootsRight"} />
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-foreground-secondary">
                <T k="playerDetail.bioCitizenship" />
              </dt>
              <dd className="flex items-center gap-1.5 font-display text-base font-semibold text-foreground-primary">
                <span>🇦🇿</span> {bio.citizenshipCode}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex flex-col gap-14">
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
          <EmptyState textKey="playerDetail.noPriorSeasons" />
        </section>

        {/* Achievements */}
        <section>
          <SectionHeader titleKey="playerDetail.achievements" />
          <EmptyState textKey="playerDetail.noAchievements" />
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {recentTeamGames.map((game) => {
                    const isHome = game.homeTeam.id === player.teamId;
                    const opponent = isHome ? game.awayTeam : game.homeTeam;
                    const teamScore = (isHome ? game.homeScore : game.awayScore) ?? 0;
                    const opponentScore = (isHome ? game.awayScore : game.homeScore) ?? 0;
                    const won = teamScore > opponentScore;
                    return (
                      <tr key={game.id}>
                        <td className="px-4 py-3 text-foreground-secondary">
                          <GameDate iso={game.startTime} />
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground-primary">
                          <T k={isHome ? "playerDetail.vsHome" : "playerDetail.vsAway"} vars={{ team: opponent.name }} />
                        </td>
                        <td className="px-4 py-3">
                          <span className={won ? "font-semibold text-foreground-primary" : "text-foreground-secondary"}>
                            <T k={won ? "playerDetail.resultWin" : "playerDetail.resultLoss"} />
                          </span>{" "}
                          {teamScore} – {opponentScore}
                          {game.decidedBy === "SHOOTOUT" && (
                            <>
                              {" "}
                              <T k="game.shootoutAbbr" />
                            </>
                          )}
                        </td>
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
      </div>
    </div>
  );
}