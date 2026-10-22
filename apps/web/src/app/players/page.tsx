import type { Metadata } from "next";
import { serverT } from "@/lib/i18n/server";
import { getAllPlayers } from "@/lib/server/services/player.service";
import { PlayerCard } from "@/components/league/player-card";
import { T } from "@/components/ui/t";
import { EmptyState } from "@/components/league/empty-state";

export const revalidate = 60;

export const metadata: Metadata = {
  title: serverT("meta.players"),
};

export default async function PlayersPage() {
  const players = await getAllPlayers();

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <T
        k="players.title"
        as="h1"
        className="mb-2 font-display text-4xl font-bold uppercase text-foreground-primary"
      />
      <T k="players.subtitle" as="p" className="mb-10 text-foreground-secondary" />

      {players.length > 0 ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {players.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>
      ) : (
        <EmptyState textKey="players.empty" />
      )}
    </div>
  );
}
