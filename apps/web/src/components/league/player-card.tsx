"use client";

import Link from "next/link";
import { User } from "lucide-react";
import type { PlayerWithTeamDTO } from "@/lib/server/services/player.service";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { Card, CardContent } from "@/components/ui/card";
import { positionTranslationKey } from "@/lib/i18n/position-key";
import { useTranslation } from "@/lib/i18n/use-translation";

export function PlayerCard({ player }: { player: PlayerWithTeamDTO }) {
  const { t } = useTranslation();
  const posKey = positionTranslationKey(player.position);

  return (
    <Link href={`/players/${player.id}`} className="block">
      <Card className="h-full overflow-hidden transition-colors duration-150 hover:border-accent">
        <ImagePlaceholder
          ratio="aspect-square"
          icon={<User className="h-10 w-10 text-foreground-tertiary" strokeWidth={1.25} />}
        />
        <CardContent className="flex flex-col gap-1 p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">
            #{player.jerseyNumber} &middot; {posKey ? t(posKey) : player.position}
          </span>
          <h3 className="font-display text-base font-bold uppercase text-foreground-primary">
            {player.fullName}
          </h3>
          <span className="text-xs text-foreground-secondary">{player.team.name}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
