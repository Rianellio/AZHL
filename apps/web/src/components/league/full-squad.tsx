"use client";

import type { PlayerWithTeamDTO } from "@/lib/server/services/player.service";
import { getMockPlayerStats } from "@/lib/mock/player-stats";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { positionTranslationKey } from "@/lib/i18n/position-key";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

const GROUPS: { titleKey: TranslationKey; positions: string[] }[] = [
  { titleKey: "fullSquad.goalkeepers", positions: ["G"] },
  { titleKey: "fullSquad.defensemen", positions: ["D"] },
  { titleKey: "fullSquad.forwards", positions: ["C", "LW", "RW"] },
];

/**
 * Layout placeholders only — no real players exist yet, so no names, photos, or profile
 * links. Jersey number + position + GP/G/A/PTS demonstrate the roster structure; the CMS
 * replaces these rows with real players later without this layout changing.
 */
export function FullSquad({ players }: { players: PlayerWithTeamDTO[] }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-10">
      {GROUPS.map((group) => {
        const groupPlayers = players
          .filter((p) => group.positions.includes(p.position))
          .sort((a, b) => a.jerseyNumber - b.jerseyNumber);

        if (groupPlayers.length === 0) return null;

        return (
          <div key={group.titleKey}>
            <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-foreground-secondary">
              {t(group.titleKey)}
            </h3>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("fullSquad.colNum")}</TableHeaderCell>
                  <TableHeaderCell>{t("fullSquad.colPos")}</TableHeaderCell>
                  <TableHeaderCell>{t("standings.colGP")}</TableHeaderCell>
                  <TableHeaderCell>{t("playerDetail.colG")}</TableHeaderCell>
                  <TableHeaderCell>{t("playerDetail.colA")}</TableHeaderCell>
                  <TableHeaderCell>{t("playerDetail.colPts")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupPlayers.map((player) => {
                  const stats = getMockPlayerStats(player);
                  const posKey = positionTranslationKey(player.position);
                  return (
                    <TableRow key={player.id}>
                      <TableCell className="font-display font-semibold text-foreground-primary">
                        {player.jerseyNumber}
                      </TableCell>
                      <TableCell>{posKey ? t(posKey) : player.position}</TableCell>
                      <TableCell>{stats.gamesPlayed}</TableCell>
                      <TableCell>{stats.goals}</TableCell>
                      <TableCell>{stats.assists}</TableCell>
                      <TableCell className="font-semibold text-foreground-primary">{stats.points}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        );
      })}
    </div>
  );
}
