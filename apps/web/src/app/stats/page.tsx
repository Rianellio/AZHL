import type { Metadata } from "next";
import type { StandingDTO } from "@azhl/types";
import { getAllPlayers, type PlayerWithTeamDTO } from "@/lib/server/services/player.service";
import { getCurrentSeasonStandings } from "@/lib/server/services/standings.service";
import { getMockPlayerStats } from "@/lib/mock/player-stats";
import { getMockGoalieStats } from "@/lib/mock/goalie-stats";
import { positionTranslationKey } from "@/lib/i18n/position-key";
import { SectionHeader } from "@/components/league/section-header";
import { StatLeaderboardCard, type LeaderboardEntry } from "@/components/league/stat-leaderboard-card";
import { T } from "@/components/ui/t";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Statistics",
};

/** Only ever returns entries for players with a nonzero value — with no season played, every
 * caller resolves to an empty list today, and starts populating itself the moment real stats
 * exist, with no code change needed. */
function topSkatersBy(
  skaters: PlayerWithTeamDTO[],
  statKey: "goals" | "assists" | "points",
  limit = 5,
): LeaderboardEntry[] {
  return skaters
    .map((player) => ({ player, stats: getMockPlayerStats(player) }))
    .filter(({ stats }) => stats[statKey] > 0)
    .sort((a, b) => b.stats[statKey] - a.stats[statKey])
    .slice(0, limit)
    .map(({ player, stats }) => ({
      id: player.id,
      teamSlug: player.team.slug,
      teamName: player.team.name,
      primary: player.fullName,
      positionKey: positionTranslationKey(player.position),
      value: String(stats[statKey]),
    }));
}

function topGoaliesByWins(goalies: PlayerWithTeamDTO[], limit = 5): LeaderboardEntry[] {
  return goalies
    .map((player) => ({ player, stats: getMockGoalieStats() }))
    .filter(({ stats }) => stats.wins > 0)
    .sort((a, b) => b.stats.wins - a.stats.wins)
    .slice(0, limit)
    .map(({ player, stats }) => ({
      id: player.id,
      teamSlug: player.team.slug,
      teamName: player.team.name,
      primary: player.fullName,
      secondaryTeamName: player.team.name,
      value: String(stats.wins),
    }));
}

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
            entries={topGoaliesByWins(goalies)}
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
