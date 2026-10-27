"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { GameDTO } from "@azhl/types";
import { cn } from "@/lib/utils";
import { ScoreCard } from "./score-card";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLeagueDateParts } from "@/lib/i18n/format-date";

/** Reference week (a known Sunday) purely to read locale-correct short weekday names out of
 * useTranslation()'s formatDate (Intl for en/ru, a fixed name lookup for az). */
const REFERENCE_SUNDAY = new Date(2023, 0, 1);

/**
 * formatDate renders in Baku time, but the grid's Date objects are local midnights used only for
 * y/m/d arithmetic — east of Baku that midnight is still the previous day there. 12:00 UTC is
 * the same calendar day in Baku (16:00), so pass grid dates through this before formatting.
 */
function asLeagueDay(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));
}

/** Grid cells are plain calendar days (local Date objects used only for y/m/d arithmetic). */
function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** A game's day is its Baku calendar day, so a 00:30 game lands on the right cell in any time zone. */
function gameDateKey(iso: string): string {
  const { year, month, day } = getLeagueDateParts(iso);
  return `${year}-${month}-${day}`;
}

/**
 * Lightweight month-grid calendar, no external date library — the site has none installed and
 * a single month grid doesn't need one. Days with games are clickable and show that day's
 * match cards below; days without games are inert (nothing to invent for an empty day).
 */
export function ScheduleCalendar({ games }: { games: GameDTO[] }) {
  const { t, formatDate } = useTranslation();

  const weekdayLabels = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(REFERENCE_SUNDAY);
      day.setDate(REFERENCE_SUNDAY.getDate() + i);
      return formatDate(asLeagueDay(day), { weekday: "short" });
    });
  }, [formatDate]);

  const initialMonth = useMemo(() => {
    if (games.length === 0) return new Date();
    const earliest = [...games].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    )[0]!;
    const { year, month, day } = getLeagueDateParts(earliest.startTime);
    return new Date(year, month, day);
  }, [games]);

  const [monthCursor, setMonthCursor] = useState(
    () => new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1),
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const gamesByDay = useMemo(() => {
    const map = new Map<string, GameDTO[]>();
    for (const game of games) {
      const key = gameDateKey(game.startTime);
      const list = map.get(key) ?? [];
      list.push(game);
      map.set(key, list);
    }
    return map;
  }, [games]);

  const cells = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const startOffset = new Date(year, month, 1).getDay();
    const gridStart = new Date(year, month, 1 - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + i);
      return date;
    });
  }, [monthCursor]);

  const selectedGames = selectedKey ? (gamesByDay.get(selectedKey) ?? []) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          aria-label={t("schedule.previousMonth")}
          className="flex h-8 w-8 items-center justify-center border border-border-subtle text-foreground-secondary transition-colors duration-150 hover:border-accent hover:text-accent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="font-display text-lg font-bold uppercase tracking-wide text-foreground-primary">
          {formatDate(asLeagueDay(monthCursor), { month: "long", year: "numeric" })}
        </h3>
        <button
          type="button"
          onClick={() => setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          aria-label={t("schedule.nextMonth")}
          className="flex h-8 w-8 items-center justify-center border border-border-subtle text-foreground-secondary transition-colors duration-150 hover:border-accent hover:text-accent"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="bg-surface-overlay p-2 text-center text-[10px] font-semibold uppercase tracking-wide text-foreground-tertiary"
          >
            {label}
          </div>
        ))}
        {cells.map((date) => {
          const inMonth = date.getMonth() === monthCursor.getMonth();
          const key = dateKey(date);
          const dayGames = gamesByDay.get(key) ?? [];
          const isSelected = key === selectedKey;
          const hasGames = dayGames.length > 0;

          return (
            <button
              key={key}
              type="button"
              disabled={!hasGames}
              onClick={() => setSelectedKey(isSelected ? null : key)}
              aria-pressed={isSelected}
              className={cn(
                "flex min-h-[76px] flex-col items-start gap-1 bg-surface-raised p-2 text-left transition-colors duration-150",
                !inMonth && "opacity-40",
                hasGames ? "cursor-pointer hover:bg-surface-hover" : "cursor-default",
                isSelected && "bg-surface-hover ring-2 ring-inset ring-accent",
              )}
            >
              <span className="text-xs font-semibold text-foreground-secondary">{date.getDate()}</span>
              {hasGames && (
                <div className="flex flex-wrap gap-1">
                  {dayGames.slice(0, 2).map((game) => (
                    <span
                      key={game.id}
                      className="rounded bg-accent-muted px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent"
                    >
                      {game.awayTeam.abbreviation} @ {game.homeTeam.abbreviation}
                    </span>
                  ))}
                  {dayGames.length > 2 && (
                    <span className="text-[9px] font-semibold text-foreground-tertiary">
                      +{dayGames.length - 2}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedGames.length > 0 && (
        <div>
          <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-foreground-secondary">
            {t("schedule.gamesOn", { date: formatDate(selectedGames[0]!.startTime, { weekday: "long", month: "long", day: "numeric" }) })}
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {selectedGames.map((game) => (
              <ScoreCard key={game.id} game={game} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
