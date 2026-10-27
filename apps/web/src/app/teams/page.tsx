import type { Metadata } from "next";
import { serverT } from "@/lib/i18n/server";
import { getAllTeams } from "@/lib/server/services/team.service";
import { getCurrentSeasonStandings } from "@/lib/server/services/standings.service";
import { getCurrentSeasonSchedule } from "@/lib/server/services/schedule.service";
import { getAllPlayers } from "@/lib/server/services/player.service";
import { getCurrentSeason } from "@/lib/server/services/season.service";
import { isUpcoming } from "@/lib/game-status";
import { TeamCard, TeamsSubtitle, type TeamCardData } from "@/components/league/team-card";
import { T } from "@/components/ui/t";

export const revalidate = 60;

export const metadata: Metadata = {
  title: serverT("meta.teams"),
};

export default async function TeamsPage() {
  const [teams, standings, schedule, players, season] = await Promise.all([
    getAllTeams(),
    getCurrentSeasonStandings(),
    getCurrentSeasonSchedule(),
    getAllPlayers(),
    getCurrentSeason(),
  ]);

  const upcoming = schedule.filter((game) => isUpcoming(game));
  const cards: TeamCardData[] = teams.map((team) => {
    const standing = standings.find((row) => row.team.id === team.id);
    // Schedule is ascending by start time, so the first upcoming game involving the team is next.
    const next = upcoming.find(
      (game) => game.homeTeam.id === team.id || game.awayTeam.id === team.id,
    );
    return {
      team,
      // Pre-season every rank/points value is a tiebreak artifact, not a result — show "—".
      standing:
        standing && standing.gamesPlayed > 0
          ? { rank: standing.rank, points: standing.points }
          : null,
      nextGame: next
        ? {
            opponent: next.homeTeam.id === team.id ? next.awayTeam : next.homeTeam,
            startTime: next.startTime,
            startTimeConfirmed: next.startTimeConfirmed,
          }
        : null,
      rosterSize: players.filter((player) => player.teamId === team.id).length,
    };
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <T
          k="teams.title"
          as="h1"
          className="font-display text-foreground-primary text-5xl font-bold uppercase leading-none tracking-tight lg:text-6xl"
        />
        <TeamsSubtitle count={teams.length} seasonLabel={season?.label ?? null} />
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        {cards.map((card) => (
          <TeamCard key={card.team.id} {...card} />
        ))}
      </div>
    </div>
  );
}
