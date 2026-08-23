"use client";

import { useMemo, useState } from "react";
import type { GameDTO } from "@azhl/types";
import { formatGameDate } from "@azhl/utils";
import { cn } from "@/lib/utils";
import { ScoreCard } from "./score-card";
import { ScheduleCalendar } from "./schedule-calendar";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

type TabKey = "upcoming" | "completed" | "calendar";

const TABS: { key: TabKey; labelKey: TranslationKey }[] = [
  { key: "upcoming", labelKey: "schedule.upcomingGames" },
  { key: "completed", labelKey: "schedule.completedGames" },
  { key: "calendar", labelKey: "schedule.calendar" },
];

export function ScheduleList({
  games,
  initialTeamSlug,
}: {
  games: GameDTO[];
  initialTeamSlug?: string | undefined;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>("upcoming");
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

  const upcoming = useMemo(
    () =>
      filtered
        .filter((game) => game.status === "SCHEDULED" || game.status === "LIVE")
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [filtered],
  );

  const completed = useMemo(
    () =>
      filtered
        .filter((game) => game.status === "FINAL")
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
    [filtered],
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2" role="tablist" aria-label={t("schedule.scheduleView")}>
          {TABS.map((tabDef) => (
            <button
              key={tabDef.key}
              type="button"
              role="tab"
              aria-selected={tab === tabDef.key}
              onClick={() => setTab(tabDef.key)}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors duration-150",
                tab === tabDef.key
                  ? "bg-accent text-accent-tint"
                  : "border border-border-subtle text-foreground-secondary hover:border-accent hover:text-foreground-primary",
              )}
            >
              {t(tabDef.labelKey)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="team-filter" className="text-sm font-medium text-foreground-secondary">
            {t("common.team")}
          </label>
          <select
            id="team-filter"
            value={teamFilter}
            onChange={(event) => setTeamFilter(event.target.value)}
            className="rounded-md border border-border-subtle bg-surface-raised px-3 py-2 text-sm text-foreground-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="all">{t("common.allTeams")}</option>
            {teams.map(([slug, name]) => (
              <option key={slug} value={slug}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {tab === "upcoming" && <GameGrid games={upcoming} emptyMessageKey="schedule.noUpcoming" />}
      {tab === "completed" && <GameGrid games={completed} emptyMessageKey="schedule.noCompleted" />}
      {tab === "calendar" && <ScheduleCalendar games={filtered} />}
    </div>
  );
}

function GameGrid({ games, emptyMessageKey }: { games: GameDTO[]; emptyMessageKey: TranslationKey }) {
  const { t, intlTag } = useTranslation();
  const grouped = useMemo(() => {
    const map = new Map<string, GameDTO[]>();
    for (const game of games) {
      const key = formatGameDate(game.startTime, intlTag);
      const existing = map.get(key) ?? [];
      existing.push(game);
      map.set(key, existing);
    }
    return Array.from(map.entries());
  }, [games, intlTag]);

  if (games.length === 0) {
    return <p className="text-sm text-foreground-secondary">{t(emptyMessageKey)}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
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
