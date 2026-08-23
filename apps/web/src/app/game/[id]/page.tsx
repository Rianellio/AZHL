import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGameById } from "@/lib/server/services/schedule.service";
import { Badge } from "@/components/ui/badge";
import { LiveDot } from "@/components/ui/live-dot";
import { Card, CardContent } from "@/components/ui/card";
import { TeamLogo } from "@/components/league/team-logo";
import { GameDate, GameTime } from "@/components/league/game-date";
import { T } from "@/components/ui/t";
import type { GameDTO } from "@azhl/types";
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
            <T k={STATUS_LABEL_KEY[game.status]!} /> &middot; <T k="game.period" /> {game.period ?? 1}
          </Badge>
        ) : (
          <Badge variant="neutral">
            <T k={STATUS_LABEL_KEY[game.status]!} />
          </Badge>
        )}
        <span className="text-sm text-foreground-secondary">
          <GameDate iso={game.startTime} /> &middot; <GameTime iso={game.startTime} />
        </span>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-8 p-8">
          <TeamScoreRow team={game.awayTeam} score={game.awayScore} labelKey="game.away" />
          <div className="h-px bg-border-subtle" />
          <TeamScoreRow team={game.homeTeam} score={game.homeScore} labelKey="game.home" />
        </CardContent>
      </Card>

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
