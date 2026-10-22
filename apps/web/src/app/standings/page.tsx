import type { Metadata } from "next";
import { serverT } from "@/lib/i18n/server";
import { getCurrentSeasonStandings } from "@/lib/server/services/standings.service";
import { StandingsTable } from "@/components/league/standings-table";
import { T } from "@/components/ui/t";
import { EmptyState } from "@/components/league/empty-state";

export const revalidate = 60;

export const metadata: Metadata = {
  title: serverT("meta.standings"),
};

export default async function StandingsPage() {
  const standings = await getCurrentSeasonStandings();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <T
        k="standings.title"
        as="h1"
        className="mb-2 font-display text-4xl font-bold text-foreground-primary"
      />
      <T k="standings.subtitle" as="p" className="mb-8 text-foreground-secondary" />
      {standings.length > 0 ? (
        <StandingsTable standings={standings} />
      ) : (
        <EmptyState textKey="standings.empty" />
      )}
    </div>
  );
}
