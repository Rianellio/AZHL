import type { Metadata } from "next";
import type { StandingDTO } from "@azhl/types";
import { getAllPlayers } from "@/lib/server/services/player.service";
import { getCurrentSeasonStandings } from "@/lib/server/services/standings.service";
import { topGoaliesBy, topSkatersBy } from "@/lib/stat-leaders";
import { SectionHeader } from "@/components/league/section-header";
import { StatLeaderboardCard, type LeaderboardEntry } from "@/components/league/stat-leaderboard-card";
import { T } from "@/components/ui/t";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Statistics",
};

function topTeamsBy(
  standings: StandingDTO[],
  statKey: "goalsFor" | "goalsAgainst",
  limit = 4,
): LeaderboardEntry[] {
  return standings
    .filter((standing) => standing[statKey] > 0)
    .sort((a, b) => b[statKey] - a[statKey])
    .slice(0, limit)
    .map((standing) => ({
      id: standing.team.id,
      teamSlug: standing.team.slug,
      teamName: standing.team.name,
      primary: standing.team.name,
      value: String(standing[statKey]),
    }));
}

export default async function StatsPage() {
  const [players, standings] = await Promise.all([getAllPlayers(), getCurrentSeasonStandings()]);
  const skaters = players.filter((player) => player.position !== "G");
  const goalies = players.filter((player) => player.position === "G");

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <T k="stats.title" as="h1" className="mb-2 font-display text-4xl font-bold text-foreground-primary" />
      <T k="stats.subtitle" as="p" className="mb-12 text-foreground-secondary" />

      <section className="mb-14">
        <SectionHeader titleKey="stats.players" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatLeaderboardCard
            titleKey="stats.goals"
            abbreviationKey="playerDetail.colG"
            entries={topSkatersBy(skaters, "goals")}
            emptyMessageKey="stats.emptyGoals"
          />
          <StatLeaderboardCard
            titleKey="stats.assists"
            abbreviationKey="playerDetail.colA"
            entries={topSkatersBy(skaters, "assists")}
            emptyMessageKey="stats.emptyAssists"
          />
          <StatLeaderboardCard
            titleKey="stats.points"
            abbreviationKey="playerDetail.colPts"
            entries={topSkatersBy(skaters, "points")}
            emptyMessageKey="stats.emptyPoints"
          />
          <StatLeaderboardCard
            titleKey="stats.goalies"
            abbreviationKey="standings.colW"
            entries={topGoaliesBy(goalies, "wins")}
            emptyMessageKey="stats.emptyGoalies"
          />
        </div>
      </section>

      <section>
        <SectionHeader titleKey="stats.teams" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatLeaderboardCard
            titleKey="stats.goalsFor"
            abbreviationKey="standings.colGF"
            entries={topTeamsBy(standings, "goalsFor")}
            emptyMessageKey="stats.emptyGoalsFor"
          />
          <StatLeaderboardCard
            titleKey="stats.goalsAgainst"
            abbreviationKey="standings.colGA"
            entries={topTeamsBy(standings, "goalsAgainst")}
            emptyMessageKey="stats.emptyGoalsAgainst"
          />
          <StatLeaderboardCard
            titleKey="stats.powerPlay"
            abbreviationKey="stats.abbrPP"
            entries={[]}
            emptyMessageKey="stats.emptyPowerPlay"
          />
          <StatLeaderboardCard
            titleKey="stats.penaltyKill"
            abbreviationKey="stats.abbrPK"
            entries={[]}
            emptyMessageKey="stats.emptyPenaltyKill"
          />
        </div>
      </section>
    </div>
  );
}
