import type { Metadata } from "next";
import { getCurrentSeasonSchedule } from "@/lib/server/services/schedule.service";
import { ScheduleList } from "@/components/league/schedule-list";

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

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="mb-2 font-display text-4xl font-bold text-foreground-primary">Schedule</h1>
      <p className="mb-8 text-foreground-secondary">2025&ndash;26 Season &mdash; filter by team.</p>
      <ScheduleList games={games} initialTeamSlug={team} />
    </div>
  );
}
