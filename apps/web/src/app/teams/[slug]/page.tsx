import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTeamBySlug } from "@/lib/server/services/team.service";
import { getPlayersByTeamId } from "@/lib/server/services/player.service";
import { getCurrentSeasonStandings } from "@/lib/server/services/standings.service";
import { SectionHeader } from "@/components/league/section-header";
import { StatTile } from "@/components/league/stat-tile";
import { RinkRoster } from "@/components/league/rink-roster";
import { FullSquad } from "@/components/league/full-squad";
import { TeamLogo } from "@/components/league/team-logo";
import { EmptyState } from "@/components/league/empty-state";
import { StatLeaderboardCard } from "@/components/league/stat-leaderboard-card";
import { topGoaliesBy, topSkatersBy } from "@/lib/stat-leaders";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const team = await getTeamBySlug(slug);
  return { title: team ? team.name : "Team not found" };
}

/** Deliberately minimal — logo, name, rink, squad, stats only. See .claude/roadmap.md for when club info/history returns with real data. */
export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = await getTeamBySlug(slug);
  if (!team) notFound();

  const [players, standings] = await Promise.all([
    getPlayersByTeamId(team.id),
    getCurrentSeasonStandings(),
  ]);

  const standing = standings.find((s) => s.team.id === team.id);
  const skaters = players.filter((player) => player.position !== "G");
  const goalies = players.filter((player) => player.position === "G");

  return (
    <div className="flex flex-col">
      {/* Hero — identity only: logo + name */}
      <section className="relative border-b border-border-subtle bg-surface-base">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 px-6 py-16 text-center">
          <TeamLogo teamSlug={team.slug} teamName={team.name} size={160} />
          <h1 className="font-display text-5xl font-bold uppercase tracking-wide text-foreground-primary">
            {team.name}
          </h1>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-6 py-14">
        {/* Lineup on the rink — see RinkRoster */}
        <section>
          <SectionHeader titleKey="teamDetail.rosterByPosition" />
          <RinkRoster players={players} accent={team.colors.accent} />
        </section>

        {/* Team leaders — same nonzero-only rule as /stats, so this is an empty state until real stats exist */}
        <section>
          <SectionHeader titleKey="teamDetail.teamLeaders" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatLeaderboardCard
              titleKey="stats.points"
              abbreviationKey="playerDetail.colPts"
              entries={topSkatersBy(skaters, "points", 3)}
              emptyMessageKey="stats.emptyPoints"
            />
            <StatLeaderboardCard
              titleKey="stats.goals"
              abbreviationKey="playerDetail.colG"
              entries={topSkatersBy(skaters, "goals", 3)}
              emptyMessageKey="stats.emptyGoals"
            />
            <StatLeaderboardCard
              titleKey="stats.assists"
              abbreviationKey="playerDetail.colA"
              entries={topSkatersBy(skaters, "assists", 3)}
              emptyMessageKey="stats.emptyAssists"
            />
            <StatLeaderboardCard
              titleKey="stats.goalies"
              abbreviationKey="playerDetail.colSvPct"
              entries={topGoaliesBy(goalies, "savePercentage", 3)}
              emptyMessageKey="stats.emptyGoalies"
            />
          </div>
        </section>

        {/* Full squad, grouped by position */}
        <section>
          <SectionHeader titleKey="teamDetail.fullSquad" />
          {players.length > 0 ? (
            <FullSquad players={players} />
          ) : (
            <EmptyState textKey="teamDetail.rosterNotAnnounced" />
          )}
        </section>

        {/* Season statistics */}
        <section>
          <SectionHeader
            titleKey="teamDetail.teamStatistics"
            action={{ labelKey: "teamDetail.fullStandings", href: "/standings" }}
          />
          {standing ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
              <StatTile labelKey="teamDetail.rank" value={standing.rank} />
              <StatTile labelKey="standings.colGP" value={standing.gamesPlayed} />
              <StatTile labelKey="standings.colW" value={standing.wins} />
              <StatTile labelKey="standings.colSOW" value={standing.shootoutWins} />
              <StatTile labelKey="standings.colSOL" value={standing.shootoutLosses} />
              <StatTile labelKey="standings.colL" value={standing.losses} />
              <StatTile labelKey="standings.colPTS" value={standing.points} />
              <StatTile labelKey="teamDetail.gfga" value={`${standing.goalsFor} / ${standing.goalsAgainst}`} />
            </div>
          ) : (
            <EmptyState textKey="teamDetail.standingsWillAppear" />
          )}
        </section>
      </div>
    </div>
  );
}
