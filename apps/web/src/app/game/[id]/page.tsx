import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGameById } from "@/lib/server/services/schedule.service";
import { formatGameDate, formatGameTime } from "@azhl/utils";
import { Badge } from "@/components/ui/badge";
import { LiveDot } from "@/components/ui/live-dot";
import { Card, CardContent } from "@/components/ui/card";

export const revalidate = 60;

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Upcoming",
  LIVE: "Live",
  FINAL: "Final",
  POSTPONED: "Postponed",
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
            {STATUS_LABEL[game.status]} &middot; Period {game.period ?? 1}
          </Badge>
        ) : (
          <Badge variant="neutral">{STATUS_LABEL[game.status]}</Badge>
        )}
        <span className="text-sm text-foreground-secondary">
          {formatGameDate(game.startTime)} &middot; {formatGameTime(game.startTime)}
        </span>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-8 p-8">
          <TeamScoreRow
            abbreviation={game.awayTeam.abbreviation}
            name={game.awayTeam.name}
            score={game.awayScore}
            accent={game.awayTeam.colors.accent}
            label="Away"
          />
          <div className="h-px bg-border-subtle" />
          <TeamScoreRow
            abbreviation={game.homeTeam.abbreviation}
            name={game.homeTeam.name}
            score={game.homeScore}
            accent={game.homeTeam.colors.accent}
            label="Home"
          />
        </CardContent>
      </Card>

      <p className="mt-6 text-sm text-foreground-secondary">{game.venue}</p>
    </div>
  );
}

function TeamScoreRow({
  abbreviation,
  name,
  score,
  accent,
  label,
}: {
  abbreviation: string;
  name: string;
  score: number | null;
  accent: string;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full font-display text-sm font-bold text-surface-base"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        >
          {abbreviation}
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-secondary">
            {label}
          </p>
          <p className="font-display text-xl font-semibold text-foreground-primary">{name}</p>
        </div>
      </div>
      <span className="font-display text-4xl font-bold text-foreground-primary">{score ?? "-"}</span>
    </div>
  );
}
