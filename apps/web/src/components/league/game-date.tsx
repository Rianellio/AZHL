"use client";

import { useTranslation } from "@/lib/i18n/use-translation";

/** Locale-aware "Sat, Nov 8" / "19:30" (Baku time) — thin client wrappers around
 * useTranslation()'s formatGameDate/formatGameTime (Intl for en/ru, a name lookup for az) so Server
 * Component pages (schedule cards, game center, player recent-games table) render dates in the
 * active UI locale without becoming Client Components themselves. */
export function GameDate({ iso }: { iso: string }) {
  const { formatGameDate } = useTranslation();
  return <>{formatGameDate(iso)}</>;
}

/** Shows "Time TBA" (localized) until the league confirms the face-off time — an unconfirmed
 * startTime only carries the date (stored at 12:00 UTC), so its clock time is meaningless. */
export function GameTime({ iso, confirmed }: { iso: string; confirmed: boolean }) {
  const { t, formatGameTime } = useTranslation();
  return <>{confirmed ? formatGameTime(iso) : t("game.timeTba")}</>;
}
