"use client";

import type { StandingDTO } from "@azhl/types";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { TeamLogo } from "./team-logo";
import { useTranslation } from "@/lib/i18n/use-translation";

/** Compact, non-interactive standings snapshot for Home — the full sortable table lives at /standings. */
export function StandingsWidget({ standings }: { standings: StandingDTO[] }) {
  const { t } = useTranslation();
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>{t("standings.colTeam")}</TableHeaderCell>
          <TableHeaderCell>{t("standings.colGP")}</TableHeaderCell>
          <TableHeaderCell>{t("standings.colW")}</TableHeaderCell>
          <TableHeaderCell>{t("standings.colL")}</TableHeaderCell>
          <TableHeaderCell>{t("standings.colOTL")}</TableHeaderCell>
          <TableHeaderCell>{t("standings.colPTS")}</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {standings.map((standing) => (
          <TableRow key={standing.team.id}>
            <TableCell>
              <div className="flex items-center gap-2 font-medium text-foreground-primary">
                <span className="w-4 text-xs text-foreground-tertiary">{standing.rank}</span>
                <TeamLogo teamSlug={standing.team.slug} teamName={standing.team.name} size={24} />
                <span className="uppercase">{standing.team.name}</span>
              </div>
            </TableCell>
            <TableCell>{standing.gamesPlayed}</TableCell>
            <TableCell>{standing.wins}</TableCell>
            <TableCell>{standing.losses}</TableCell>
            <TableCell>{standing.otLosses}</TableCell>
            <TableCell className="font-semibold text-foreground-primary">{standing.points}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
