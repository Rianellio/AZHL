"use client";

import Link from "next/link";
import type { PlayerWithTeamDTO } from "@/lib/server/services/player.service";
import type { MockPlayerStatLine } from "@/lib/mock/player-stats";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { User } from "lucide-react";
import { positionTranslationKey } from "@/lib/i18n/position-key";
import { useTranslation } from "@/lib/i18n/use-translation";

/** Deliberately identity-free — Home stays clear of invented player names; the roster/profile pages (further into the site, where a visitor has opted into browsing a team) carry the full placeholder identities. */
export function TopPlayerRow({
  player,
  stats,
}: {
  player: PlayerWithTeamDTO;
  stats: MockPlayerStatLine;
}) {
  const { t } = useTranslation();
  const posKey = positionTranslationKey(player.position);

  return (
    <Link
      href={`/players/${player.id}`}
      className="flex items-center gap-3 border border-border-subtle bg-surface-raised p-3 transition-colors duration-150 hover:border-accent"
    >
      <ImagePlaceholder
        ratio="aspect-square"
        className="h-11 w-11 shrink-0 rounded-full"
        icon={<User className="h-4 w-4 text-foreground-tertiary" strokeWidth={1.5} />}
      />
      <div className="flex flex-1 flex-col leading-tight">
        <span className="text-sm font-semibold text-foreground-primary">
          #{player.jerseyNumber} &middot; {posKey ? t(posKey) : player.position}
        </span>
        <span className="text-xs uppercase tracking-wide text-foreground-secondary">
          {player.team.name}
        </span>
      </div>
      <span className="font-display text-sm font-bold text-accent">
        {stats.points} {t("standings.colPTS")}
      </span>
    </Link>
  );
}
