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

export function GameTime({ iso }: { iso: string }) {
  const { intlTag } = useTranslation();
  return <>{formatGameTime(iso, intlTag)}</>;
}
