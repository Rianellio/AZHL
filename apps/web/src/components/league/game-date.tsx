"use client";

import { formatGameDate, formatGameTime } from "@azhl/utils";
import { useTranslation } from "@/lib/i18n/use-translation";

/** Locale-aware "Sat, Nov 8" / "7:00 PM ET" — thin client wrappers around
 * @azhl/utils's formatGameDate/formatGameTime so Server Component pages (schedule cards, game
 * center, player recent-games table) render dates in the active UI locale without becoming
 * Client Components themselves. */
export function GameDate({ iso }: { iso: string }) {
  const { intlTag } = useTranslation();
  return <>{formatGameDate(iso, intlTag)}</>;
}

/** Shows "Time TBA" (localized) until the league confirms the face-off time — an unconfirmed
 * startTime only carries the date (stored at 12:00 UTC), so its clock time is meaningless. */
export function GameTime({ iso, confirmed }: { iso: string; confirmed: boolean }) {
  const { t, intlTag } = useTranslation();
  return <>{confirmed ? formatGameTime(iso, intlTag) : t("game.timeTba")}</>;
}
