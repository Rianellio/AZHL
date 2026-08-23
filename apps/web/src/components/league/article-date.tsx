"use client";

import { useTranslation } from "@/lib/i18n/use-translation";

/** Locale-aware "August 13, 2026" / "13 avqust 2026" / "13 августа 2026 г." — built from
 * `Intl.DateTimeFormat` via useTranslation()'s formatDate, never manually concatenated. */
export function ArticleDate({ iso }: { iso: string }) {
  const { formatDate } = useTranslation();
  return <>{formatDate(iso, { month: "long", day: "numeric", year: "numeric" })}</>;
}
