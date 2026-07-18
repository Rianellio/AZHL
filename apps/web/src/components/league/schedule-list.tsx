"use client";

import { useMemo, useState } from "react";
import type { GameDTO } from "@azhl/types";
import { formatGameDate } from "@azhl/utils";
import { ScoreCard } from "./score-card";

export function ScheduleList({
  games,
  initialTeamSlug,
}: {
  games: GameDTO[];
  initialTeamSlug?: string | undefined;
}) {
  const [teamFilter, setTeamFilter] = useState(initialTeamSlug ?? "all");

  const teams = useMemo(() => {
    const map = new Map<string, string>();
    for (const game of games) {
      map.set(game.homeTeam.slug, game.homeTeam.name);
      map.set(game.awayTeam.slug, game.awayTeam.name);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [games]);

  const filtered = useMemo(() => {
    if (teamFilter === "all") return games;
    return games.filter(
      (game) => game.homeTeam.slug === teamFilter || game.awayTeam.slug === teamFilter,
    );
  }, [games, teamFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, GameDTO[]>();
    for (const game of filtered) {
      const key = formatGameDate(game.startTime);
      const existing = map.get(key) ?? [];
      existing.push(game);
      map.set(key, existing);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <label htmlFor="team-filter" className="text-sm font-medium text-foreground-secondary">
          Team
        </label>
        <select
          id="team-filter"
          value={teamFilter}
          onChange={(event) => setTeamFilter(event.target.value)}
          className="rounded-md border border-border-subtle bg-surface-raised px-3 py-2 text-sm text-foreground-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="all">All teams</option>
          {teams.map(([slug, name]) => (
            <option key={slug} value={slug}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {grouped.length === 0 && (
        <p className="text-sm text-foreground-secondary">No games match this filter.</p>
      )}

      {grouped.map(([date, dateGames]) => (
        <section key={date} aria-label={date}>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-foreground-secondary">
            {date}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dateGames.map((game) => (
              <ScoreCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
