import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGameById } from "@/lib/server/services/schedule.service";
import { Badge } from "@/components/ui/badge";
import { LiveDot } from "@/components/ui/live-dot";
import { Card, CardContent } from "@/components/ui/card";
import { TeamLogo } from "@/components/league/team-logo";
import { GameDate, GameTime } from "@/components/league/game-date";
import { T } from "@/components/ui/t";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import type { GameDTO } from "@azhl/types";
import { isAwaitingResult } from "@/lib/game-status";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export const revalidate = 60;

const STATUS_LABEL_KEY: Record<string, TranslationKey> = {
  SCHEDULED: "status.upcoming",
  LIVE: "status.live",
  FINAL: "status.final",
  POSTPONED: "status.postponed",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const game = await getGameById(id);
  if (!game) return { title: "Game not found" };
  return { title: `${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}` };
}

export default async function GameCenterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await getGameById(id);
  if (!game) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        {game.status === "LIVE" ? (
          <Badge variant="live">
            <LiveDot />
            <T k={STATUS_LABEL_KEY[game.status]!} />
            {game.period !== null && (
              <>
                {" "}
                &middot; <T k="game.period" /> {game.period}
              </>
            )}
          </Badge>
        ) : (
          <Badge variant="neutral">
            <T k={isAwaitingResult(game) ? "status.awaitingResult" : STATUS_LABEL_KEY[game.status]!} />
          </Badge>
        )}
        <span className="text-sm text-foreground-secondary">
          <GameDate iso={game.startTime} /> &middot; <GameTime iso={game.startTime} confirmed={game.startTimeConfirmed} />
        </span>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-8 p-8">
          <TeamScoreRow team={game.awayTeam} score={game.awayScore} labelKey="game.away" />
          <div className="h-px bg-border-subtle" />
          <TeamScoreRow team={game.homeTeam} score={game.homeScore} labelKey="game.home" />
          {game.decidedBy === "SHOOTOUT" && game.homeScore !== null && game.awayScore !== null && (
            <p className="text-sm font-semibold uppercase tracking-wide text-foreground-secondary">
              {game.awayScore}:{game.homeScore} <T k="game.shootoutAbbr" />
              {game.awayShootoutGoals !== null && game.homeShootoutGoals !== null && (
                <span className="ml-2 font-medium normal-case text-foreground-tertiary">
                  (<T k="game.shootout" /> {game.awayShootoutGoals}:{game.homeShootoutGoals})
                </span>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {(game.homePeriodScores.length > 0 || game.awayPeriodScores.length > 0) && <PeriodScores game={game} />}

      {game.homeShots !== null && game.awayShots !== null && (
        <p className="mt-4 text-sm text-foreground-secondary">
          <T k="game.shots" />: {game.awayTeam.name} {game.awayShots} &middot; {game.homeTeam.name} {game.homeShots}
        </p>
      )}

      <p className="mt-6 text-sm text-foreground-secondary">{game.venue}</p>
    </div>
  );
}

function TeamScoreRow({
  team,
  score,
  labelKey,
}: {
  team: GameDTO["homeTeam"];
  score: number | null;
  labelKey: TranslationKey;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <TeamLogo teamSlug={team.slug} teamName={team.name} size={48} />
        <div>
          <T
            k={labelKey}
            as="p"
            className="text-xs font-medium uppercase tracking-wide text-foreground-secondary"
          />
          <p className="font-display text-xl font-semibold text-foreground-primary">{team.name}</p>
        </div>
      </div>
      <span className="font-display text-4xl font-bold text-foreground-primary">{score ?? "-"}</span>
    </div>
  );
}

/** Score by period from the official protocol. The SO column is the shootout winner's +1 —
 * derived as the final score minus the period goals, so it can't disagree with the final. */
function PeriodScores({ game }: { game: GameDTO }) {
  const periodCount = Math.max(game.homePeriodScores.length, game.awayPeriodScores.length);
  const periods = Array.from({ length: periodCount }, (_, i) => i);
  const isShootout = game.decidedBy === "SHOOTOUT";
  const rows = [
    { team: game.awayTeam, periodScores: game.awayPeriodScores, total: game.awayScore },
    { team: game.homeTeam, periodScores: game.homePeriodScores, total: game.homeScore },
  ];

  return (
    <section className="mt-8">
      <T
        k="game.periodScores"
        as="h2"
        className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-foreground-secondary"
      />
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>
              <T k="standings.colTeam" />
            </TableHeaderCell>
            {periods.map((i) => (
              <TableHeaderCell key={i}>{i + 1}</TableHeaderCell>
            ))}
            {isShootout && (
              <TableHeaderCell>
                <T k="game.shootoutAbbr" />
              </TableHeaderCell>
            )}
            <TableHeaderCell>
              <T k="game.colTotal" />
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(({ team, periodScores, total }) => {
            const periodGoals = periodScores.reduce((sum, goals) => sum + goals, 0);
            return (
              <TableRow key={team.id}>
                <TableCell className="font-medium text-foreground-primary">{team.name}</TableCell>
                {periods.map((i) => (
                  <TableCell key={i}>{periodScores[i] ?? "-"}</TableCell>
                ))}
                {isShootout && <TableCell>{total !== null ? total - periodGoals : "-"}</TableCell>}
                <TableCell className="font-semibold text-foreground-primary">{total ?? "-"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}
