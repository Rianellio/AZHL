import type { Metadata } from "next";
import { getCurrentSeasonSchedule } from "@/lib/server/services/schedule.service";
import { ScheduleList } from "@/components/league/schedule-list";
import { ScheduleSubtitle } from "@/components/league/schedule-subtitle";
import { T } from "@/components/ui/t";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Schedule",
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const [games, { team }] = await Promise.all([getCurrentSeasonSchedule(), searchParams]);

  const years = games.map((game) => new Date(game.startTime).getFullYear());
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
