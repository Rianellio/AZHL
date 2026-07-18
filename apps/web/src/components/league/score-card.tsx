import Link from "next/link";
import type { GameDTO } from "@azhl/types";
import { formatGameDate, formatGameTime } from "@azhl/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveDot } from "@/components/ui/live-dot";

const STATUS_LABEL: Record<GameDTO["status"], string> = {
  SCHEDULED: "Upcoming",
  LIVE: "Live",
  FINAL: "Final",
  POSTPONED: "Postponed",
};

export function ScoreCard({ game }: { game: GameDTO }) {
  return (
    <Link href={`/game/${game.id}`} className="block">
      <Card className="transition-colors duration-150 hover:border-accent">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            {game.status === "LIVE" ? (
              <Badge variant="live">
                <LiveDot />
                {STATUS_LABEL[game.status]} &middot; P{game.period ?? 1}
              </Badge>
            ) : (
              <Badge variant="neutral">{STATUS_LABEL[game.status]}</Badge>
            )}
            <span className="text-xs text-foreground-secondary">
              {formatGameDate(game.startTime)} &middot; {formatGameTime(game.startTime)}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <TeamRow
              abbreviation={game.awayTeam.abbreviation}
              name={game.awayTeam.name}
              score={game.awayScore}
              accent={game.awayTeam.colors.accent}
            />
            <TeamRow
              abbreviation={game.homeTeam.abbreviation}
              name={game.homeTeam.name}
              score={game.homeScore}
              accent={game.homeTeam.colors.accent}
            />
          </div>

          <p className="text-xs text-foreground-secondary">{game.venue}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function TeamRow({
  abbreviation,
  name,
  score,
  accent,
}: {
  abbreviation: string;
  name: string;
  score: number | null;
  accent: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Team colors are non-text accents only (logo-container fill) — never paired at
            runtime with text, since Team.colorAccent has no guaranteed contrast against any
            given text color. See .claude/component-library.md. */}
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-surface-base"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        >
          {abbreviation}
        </span>
        <span className="text-sm font-medium text-foreground-primary">{name}</span>
      </div>
      <span className="font-display text-xl font-bold text-foreground-primary">{score ?? "-"}</span>
    </div>
  );
}
