"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { StandingDTO } from "@azhl/types";
import { formatPlusMinus } from "@azhl/utils";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { TeamLogo } from "./team-logo";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

/**
 * "otWins" has no backing field on the Standing model (schema tracks only wins/losses/
 * otLosses — a single win isn't split into regulation vs. overtime). Rendered as a real column
 * per spec, always 0 until the schema gains a dedicated field — not derived from anything, so
 * it can't drift into showing a fake number. Flagged in the Standings page hand-off.
 */
type SortKey =
  | "gamesPlayed"
  | "wins"
  | "otWins"
  | "otLosses"
  | "losses"
  | "goalsFor"
  | "goalsAgainst"
  | "diff"
  | "points";

const COLUMNS: { key: SortKey; labelKey: TranslationKey }[] = [
  { key: "gamesPlayed", labelKey: "standings.colGP" },
  { key: "wins", labelKey: "standings.colW" },
  { key: "otWins", labelKey: "standings.colOTW" },
  { key: "otLosses", labelKey: "standings.colOTL" },
  { key: "losses", labelKey: "standings.colL" },
  { key: "goalsFor", labelKey: "standings.colGF" },
  { key: "goalsAgainst", labelKey: "standings.colGA" },
  { key: "diff", labelKey: "standings.colDIFF" },
  { key: "points", labelKey: "standings.colPTS" },
];

function diffOf(standing: StandingDTO): number {
  return standing.goalsFor - standing.goalsAgainst;
}

function sortValue(standing: StandingDTO, key: SortKey): number {
  switch (key) {
    case "otWins":
      return 0;
    case "diff":
      return diffOf(standing);
    default:
      return standing[key];
  }
}

export function StandingsTable({ standings }: { standings: StandingDTO[] }) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<SortKey>("points");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const copy = [...standings];
    copy.sort((a, b) => {
      const diff = sortValue(a, sortKey) - sortValue(b, sortKey);
      return direction === "asc" ? diff : -diff;
    });
    return copy;
  }, [standings, sortKey, direction]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection("desc");
    }
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>{t("standings.colTeam")}</TableHeaderCell>
          {COLUMNS.map((column) => (
            <TableHeaderCell key={column.key}>
              <button
                type="button"
                onClick={() => handleSort(column.key)}
                className="flex items-center gap-1 text-inherit"
                aria-label={t("common.sortBy", { label: t(column.labelKey) })}
              >
                {t(column.labelKey)}
                {sortKey === column.key &&
                  (direction === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
              </button>
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {sorted.map((standing) => {
          const diff = diffOf(standing);
          return (
            <TableRow key={standing.team.id}>
              <TableCell>
                <Link
                  href={`/schedule?team=${standing.team.slug}`}
                  className="flex items-center gap-3 font-medium text-foreground-primary hover:text-accent"
                >
                  <TeamLogo teamSlug={standing.team.slug} teamName={standing.team.name} size={28} />
                  {standing.team.name}
                </Link>
              </TableCell>
              <TableCell className={cn(sortKey === "gamesPlayed" && "font-semibold text-foreground-primary")}>
                {standing.gamesPlayed}
              </TableCell>
              <TableCell className={cn(sortKey === "wins" && "font-semibold text-foreground-primary")}>
                {standing.wins}
              </TableCell>
              <TableCell className={cn(sortKey === "otWins" && "font-semibold text-foreground-primary")}>
                0
              </TableCell>
              <TableCell className={cn(sortKey === "otLosses" && "font-semibold text-foreground-primary")}>
                {standing.otLosses}
              </TableCell>
              <TableCell className={cn(sortKey === "losses" && "font-semibold text-foreground-primary")}>
                {standing.losses}
              </TableCell>
              <TableCell className={cn(sortKey === "goalsFor" && "font-semibold text-foreground-primary")}>
                {standing.goalsFor}
              </TableCell>
              <TableCell className={cn(sortKey === "goalsAgainst" && "font-semibold text-foreground-primary")}>
                {standing.goalsAgainst}
              </TableCell>
              <TableCell className={cn(sortKey === "diff" && "font-semibold text-foreground-primary")}>
                {formatPlusMinus(diff)}
              </TableCell>
              <TableCell
                className={cn(
                  "font-semibold text-foreground-primary",
                  sortKey === "points" && "bg-surface-hover",
                )}
              >
                {standing.points}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
