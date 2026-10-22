import type { Metadata } from "next";
import { serverT } from "@/lib/i18n/server";
import { getCurrentSeasonSchedule } from "@/lib/server/services/schedule.service";
import { getLeagueDateParts } from "@/lib/i18n/format-date";
import { ScheduleList } from "@/components/league/schedule-list";
import { ScheduleSubtitle } from "@/components/league/schedule-subtitle";
import { T } from "@/components/ui/t";

export const revalidate = 60;

export const metadata: Metadata = {
  title: serverT("meta.schedule"),
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const [games, { team }] = await Promise.all([getCurrentSeasonSchedule(), searchParams]);

  const years = games.map((game) => getLeagueDateParts(game.startTime).year);
  const minYear = years.length > 0 ? Math.min(...years) : undefined;
  const maxYear = years.length > 0 ? Math.max(...years) : undefined;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <T k="schedule.title" as="h1" className="mb-2 font-display text-4xl font-bold text-foreground-primary" />
      <ScheduleSubtitle minYear={minYear} maxYear={maxYear} />
      <ScheduleList games={games} initialTeamSlug={team} />
    </div>
  );
}
