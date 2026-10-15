"use client";

import Link from "next/link";
import type { GameDTO } from "@azhl/types";
import { formatGameDate, formatGameTime } from "@azhl/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamLogo } from "./team-logo";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

const STATUS_LABEL_KEY: Record<GameDTO["status"], TranslationKey> = {
  SCHEDULED: "status.upcoming",
  LIVE: "status.liveComingSoon",
  FINAL: "status.finished",
  POSTPONED: "status.postponed",
};

export function ScoreCard({ game }: { game: GameDTO }) {
  const { t, intlTag } = useTranslation();

  return (
    <Link href={`/game/${game.id}`} className="block">
      <Card className="transition-colors duration-150 hover:border-accent">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            {game.status === "LIVE" ? (
              // Real-time live tracking isn't built yet — labeled honestly rather than showing a
              // fabricated period/clock. See STATUS_LABEL_KEY above.
              <Badge variant="live">{t(STATUS_LABEL_KEY[game.status])}</Badge>
            ) : (
              <Badge variant="neutral">{t(STATUS_LABEL_KEY[game.status])}</Badge>
            )}
            <span className="text-xs text-foreground-secondary">
              {formatGameDate(game.startTime, intlTag)} &middot;{" "}
              {game.startTimeConfirmed ? formatGameTime(game.startTime, intlTag) : t("game.timeTba")}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <TeamRow team={game.awayTeam} score={game.awayScore} />
            <TeamRow team={game.homeTeam} score={game.homeScore} />
          </div>

          <p className="text-xs text-foreground-secondary">{game.venue}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function TeamRow({
  team,
  score,
}: {
  team: GameDTO["homeTeam"];
  score: number | null;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <TeamLogo teamSlug={team.slug} teamName={team.name} size={32} />
        <span className="text-sm font-medium text-foreground-primary">{team.name}</span>
      </div>
      <span className="font-display text-xl font-bold text-foreground-primary">{score ?? "-"}</span>
    </div>
  );
}
