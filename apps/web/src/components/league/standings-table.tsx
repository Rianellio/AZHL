"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { StandingDTO } from "@azhl/types";
import { formatRecord } from "@azhl/utils";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type SortKey = "rank" | "gamesPlayed" | "record" | "points" | "goalsFor" | "goalsAgainst";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "rank", label: "Rank" },
  { key: "gamesPlayed", label: "GP" },
  { key: "record", label: "W-L-OTL" },
  { key: "points", label: "PTS" },
  { key: "goalsFor", label: "GF" },
  { key: "goalsAgainst", label: "GA" },
];

function sortValue(standing: StandingDTO, key: SortKey): number {
  switch (key) {
    case "record":
      return standing.wins;
    default:
      return standing[key];
  }
}

export function StandingsTable({ standings }: { standings: StandingDTO[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

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
      setDirection(key === "rank" ? "asc" : "desc");
    }
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Team</TableHeaderCell>
          {COLUMNS.map((column) => (
            <TableHeaderCell key={column.key}>
              <button
                type="button"
                onClick={() => handleSort(column.key)}
                className="flex items-center gap-1 text-inherit"
                aria-label={`Sort by ${column.label}`}
              >
                {column.label}
                {sortKey === column.key &&
                  (direction === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
              </button>
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {sorted.map((standing) => (
          <TableRow key={standing.team.id}>
            <TableCell>
              <Link
                href={`/schedule?team=${standing.team.slug}`}
                className="flex items-center gap-3 font-medium text-foreground-primary hover:text-accent"
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-surface-base"
                  style={{ backgroundColor: standing.team.colors.accent }}
                  aria-hidden="true"
                >
                  {standing.team.abbreviation}
                </span>
                {standing.team.name}
              </Link>
            </TableCell>
            <TableCell className={cn(sortKey === "rank" && "font-semibold text-foreground-primary")}>
              {standing.rank}
            </TableCell>
            <TableCell>{standing.gamesPlayed}</TableCell>
            <TableCell>{formatRecord(standing.wins, standing.losses, standing.otLosses)}</TableCell>
            <TableCell className="font-semibold text-foreground-primary">{standing.points}</TableCell>
            <TableCell>{standing.goalsFor}</TableCell>
            <TableCell>{standing.goalsAgainst}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
