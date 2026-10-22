import type { Metadata } from "next";
import { serverT } from "@/lib/i18n/server";
import { getAllTeams } from "@/lib/server/services/team.service";
import { TeamSelectPanel } from "@/components/league/team-select-panel";

export const revalidate = 60;

export const metadata: Metadata = {
  title: serverT("meta.teams"),
};

export default async function TeamsPage() {
  const teams = await getAllTeams();

  return (
    <div className="team-select-grid flex min-h-[calc(100vh-4rem)] w-full flex-col sm:flex-row">
      {teams.map((team) => (
        <TeamSelectPanel key={team.id} team={team} />
      ))}
    </div>
  );
}
