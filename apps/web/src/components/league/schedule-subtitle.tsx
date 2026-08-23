"use client";

import { useTranslation } from "@/lib/i18n/use-translation";

/** Composes the "{season} — {suffix}" schedule subtitle client-side, since the translated word
 * for "Season" can't be resolved inside the Server Component page that derives the year range
 * from the actual schedule data. */
export function ScheduleSubtitle({
  minYear,
  maxYear,
}: {
  minYear?: number | undefined;
  maxYear?: number | undefined;
}) {
  const { t } = useTranslation();
  const season =
    minYear === undefined || maxYear === undefined
      ? t("schedule.seasonSchedule")
      : minYear === maxYear
        ? `${minYear} ${t("schedule.seasonWord")}`
        : `${minYear}–${String(maxYear).slice(2)} ${t("schedule.seasonWord")}`;

  return (
    <p className="mb-8 text-foreground-secondary">
      {season} &mdash; {t("schedule.subtitleSuffix")}
    </p>
  );
}
