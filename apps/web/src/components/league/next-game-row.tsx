"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { GameDTO } from "@azhl/types";
import { TeamLogo } from "./team-logo";
import { useTranslation } from "@/lib/i18n/use-translation";

export function NextGameRow({ game }: { game: GameDTO }) {
  const { t, formatDate, formatGameTime } = useTranslation();
  const date = new Date(game.startTime);

  return (
    <Link
      href={`/game/${game.id}`}
      className="flex items-center gap-4 border border-border-subtle bg-surface-raised p-4 transition-colors duration-150 hover:border-accent"
    >
      <div className="flex w-12 shrink-0 flex-col items-center leading-none">
        <span className="font-display text-2xl font-bold text-foreground-primary">
          {formatDate(date, { day: "2-digit" })}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-foreground-secondary">
          {formatDate(date, { month: "short" })}
        </span>
      </div>

      <div className="h-10 w-px bg-border-subtle" />

      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground-primary">
          <TeamLogo teamSlug={game.awayTeam.slug} teamName={game.awayTeam.name} size={24} />
          <span className="uppercase">{game.awayTeam.name}</span>
          <span className="text-foreground-tertiary">{t("game.versus")}</span>
          <TeamLogo teamSlug={game.homeTeam.slug} teamName={game.homeTeam.name} size={24} />
          <span className="uppercase">{game.homeTeam.name}</span>
        </div>
        {game.startTimeConfirmed && (
          <span className="whitespace-nowrap text-xs text-foreground-secondary">
            {formatGameTime(game.startTime)}
          </span>
        )}
      </div>

      <ChevronRight className="h-5 w-5 shrink-0 text-foreground-tertiary" />
    </Link>
  );
}
