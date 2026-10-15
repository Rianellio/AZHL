"use client";

import Link from "next/link";
import type { PlayerWithTeamDTO } from "@/lib/server/services/player.service";
import { getMockPlayerStats } from "@/lib/mock/player-stats";
import { getMockGoalieStats } from "@/lib/mock/goalie-stats";
import { formatCount, formatGoalsAgainstAverage, formatSavePercentage } from "@/lib/stat-format";
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
 * Roster tables grouped by position, each row linking to the player's profile. Skaters show
 * GP/G/A/PTS/PIM; goalies get their own GP/W/L/GAA/SV%/SO table. Stats are mock (zero
 * outside development — see lib/mock/README.md) until real season stats exist.
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
        const isGoalieGroup = group.positions.includes("G");

        return (
          <div key={group.titleKey}>
            <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-foreground-secondary">
              {t(group.titleKey)}
            </h3>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("fullSquad.colNum")}</TableHeaderCell>
                  <TableHeaderCell>{t("fullSquad.colPlayer")}</TableHeaderCell>
                  <TableHeaderCell>{t("fullSquad.colPos")}</TableHeaderCell>
                  <TableHeaderCell>{t("standings.colGP")}</TableHeaderCell>
                  {isGoalieGroup ? (
                    <>
                      <TableHeaderCell>{t("standings.colW")}</TableHeaderCell>
                      <TableHeaderCell>{t("standings.colL")}</TableHeaderCell>
                      <TableHeaderCell>{t("playerDetail.colGaa")}</TableHeaderCell>
                      <TableHeaderCell>{t("playerDetail.colSvPct")}</TableHeaderCell>
                      <TableHeaderCell>{t("playerDetail.colSo")}</TableHeaderCell>
                    </>
                  ) : (
                    <>
                      <TableHeaderCell>{t("playerDetail.colG")}</TableHeaderCell>
                      <TableHeaderCell>{t("playerDetail.colA")}</TableHeaderCell>
                      <TableHeaderCell>{t("playerDetail.colPts")}</TableHeaderCell>
                      <TableHeaderCell>{t("playerDetail.colPim")}</TableHeaderCell>
                    </>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {groupPlayers.map((player) => {
                  const posKey = positionTranslationKey(player.position);
                  return (
                    <TableRow key={player.id}>
                      <TableCell className="font-display font-semibold text-foreground-primary">
                        {player.jerseyNumber}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/players/${player.id}`}
                          className="font-medium text-foreground-primary hover:text-accent"
                        >
                          {player.fullName}
                        </Link>
                      </TableCell>
                      <TableCell>{posKey ? t(posKey) : player.position}</TableCell>
                      {isGoalieGroup ? <GoalieCells player={player} /> : <SkaterCells player={player} />}
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

function SkaterCells({ player }: { player: PlayerWithTeamDTO }) {
  const stats = getMockPlayerStats(player);
  const gp = stats.gamesPlayed;
  return (
    <>
      <TableCell>{gp}</TableCell>
      <TableCell>{formatCount(stats.goals, gp)}</TableCell>
      <TableCell>{formatCount(stats.assists, gp)}</TableCell>
      <TableCell className="font-semibold text-foreground-primary">{formatCount(stats.points, gp)}</TableCell>
      <TableCell>{formatCount(stats.penaltyMinutes, gp)}</TableCell>
    </>
  );
}

function GoalieCells({ player }: { player: PlayerWithTeamDTO }) {
  const stats = getMockGoalieStats(player);
  const gp = stats.gamesPlayed;
  return (
    <>
      <TableCell>{gp}</TableCell>
      <TableCell>{formatCount(stats.wins, gp)}</TableCell>
      <TableCell>{formatCount(stats.losses, gp)}</TableCell>
      <TableCell>{formatGoalsAgainstAverage(stats.goalsAgainstAverage, gp)}</TableCell>
      <TableCell className="font-semibold text-foreground-primary">
        {formatSavePercentage(stats.savePercentage, gp)}
      </TableCell>
      <TableCell>{formatCount(stats.shutouts, gp)}</TableCell>
    </>
  );
}
