import type { Metadata } from "next";
import { getCurrentSeasonStandings } from "@/lib/server/services/standings.service";
import { StandingsTable } from "@/components/league/standings-table";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Standings",
};

export default async function StandingsPage() {
  const standings = await getCurrentSeasonStandings();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="mb-2 font-display text-4xl font-bold text-foreground-primary">Standings</h1>
      <p className="mb-8 text-foreground-secondary">
        2025&ndash;26 Season &mdash; sortable by any column.
      </p>
      {standings.length > 0 ? (
        <StandingsTable standings={standings} />
      ) : (
        <p className="text-sm text-foreground-secondary">
          Standings will appear once the season begins.
        </p>
      )}
    </div>
  );
}
