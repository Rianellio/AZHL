import type { GameDTO } from "@azhl/types";
import { getLeagueDateParts } from "@/lib/i18n/format-date";

/** Baku calendar day as a sortable number (YYYYMMDD). */
function leagueDayNumber(date: Date | string): number {
  const { year, month, day } = getLeagueDateParts(date);
  return year * 10000 + (month + 1) * 100 + day;
}

/**
 * A SCHEDULED game whose Baku calendar day has already passed — played (or due to be), but its
 * result isn't entered yet. Compared by day, not instant: an unconfirmed face-off time is only a
 * date, so a game counts as upcoming for the whole of its match day.
 */
export function isAwaitingResult(game: GameDTO, now: Date = new Date()): boolean {
  return game.status === "SCHEDULED" && leagueDayNumber(game.startTime) < leagueDayNumber(now);
}

/** Still to be played: live, postponed (to be rescheduled), or scheduled for today or later. */
export function isUpcoming(game: GameDTO, now: Date = new Date()): boolean {
  if (game.status === "LIVE" || game.status === "POSTPONED") return true;
  return game.status === "SCHEDULED" && !isAwaitingResult(game, now);
}
