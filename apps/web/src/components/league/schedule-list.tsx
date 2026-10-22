"use client";

import { useMemo, useState } from "react";
import type { GameDTO } from "@azhl/types";
import { cn } from "@/lib/utils";
import { ScoreCard } from "./score-card";
import { ScheduleCalendar } from "./schedule-calendar";
import { useTranslation } from "@/lib/i18n/use-translation";
import { isAwaitingResult, isUpcoming } from "@/lib/game-status";
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
        .filter((game) => isUpcoming(game))
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [filtered],
  );

  // Results: finals, plus past games whose result hasn't been entered yet ("Awaiting result").
  const completed = useMemo(
    () =>
      filtered
        .filter((game) => game.status === "FINAL" || isAwaitingResult(game))
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
    [filtered],
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2" role="tablist" aria-label={t("schedule.scheduleView")}>
          {TABS.map((tabDef, index) => (
            <button
              key={tabDef.key}
              id={`schedule-tab-${tabDef.key}`}
              type="button"
              role="tab"
              aria-selected={tab === tabDef.key}
              aria-controls="schedule-tabpanel"
              tabIndex={tab === tabDef.key ? 0 : -1}
              onClick={() => setTab(tabDef.key)}
              onKeyDown={(event) => {
                // WAI-ARIA tabs pattern: arrow keys move between tabs (roving tabindex).
                const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
                if (step === 0) return;
                event.preventDefault();
                const next = TABS[(index + step + TABS.length) % TABS.length]!;
                setTab(next.key);
                document.getElementById(`schedule-tab-${next.key}`)?.focus();
              }}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
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

      <div id="schedule-tabpanel" role="tabpanel" aria-labelledby={`schedule-tab-${tab}`}>
        {tab === "upcoming" && <GameGrid games={upcoming} emptyMessageKey="schedule.noUpcoming" />}
        {tab === "completed" && <GameGrid games={completed} emptyMessageKey="schedule.noCompleted" />}
        {tab === "calendar" && <ScheduleCalendar games={filtered} />}
      </div>
    </div>
  );
}

function GameGrid({ games, emptyMessageKey }: { games: GameDTO[]; emptyMessageKey: TranslationKey }) {
  const { t, formatGameDate } = useTranslation();
  const grouped = useMemo(() => {
    const map = new Map<string, GameDTO[]>();
    for (const game of games) {
      const key = formatGameDate(game.startTime);
      const existing = map.get(key) ?? [];
      existing.push(game);
      map.set(key, existing);
    }
    return Array.from(map.entries());
  }, [games, formatGameDate]);

  if (games.length === 0) {
    return <p className="text-sm text-foreground-secondary">{t(emptyMessageKey)}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {grouped.map(([date, dateGames]) => (
        <section key={date} aria-label={date}>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-foreground-secondary">
            {date}
            {dateGames.every((game) => !game.startTimeConfirmed) && <> &middot; {t("game.timeTba")}</>}
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
