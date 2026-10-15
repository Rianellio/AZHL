"use client";

import Link from "next/link";
import type { PlayerSummaryDTO } from "@azhl/types";
import { RINK_SLOT_POSITION, assignPlayersToSlots, type RinkSlot } from "@/lib/mock/rink-positions";
import { rinkSlotTranslationKey } from "@/lib/i18n/position-key";
import { useTranslation } from "@/lib/i18n/use-translation";

const SLOT_ORDER: RinkSlot[] = ["G", "LD", "RD", "LW", "C", "RW"];

/**
 * Starting lineup on the rink. Each slot shows the assigned player's jersey number and links
 * to their profile; the name appears on hover/focus. A slot with no player falls back to the
 * position-only marker, so a partial or empty roster still renders the full rink.
 */
export function RinkRoster({ players, accent }: { players: PlayerSummaryDTO[]; accent: string }) {
  const lineup = assignPlayersToSlots(players);

  return (
    <div className="relative mx-auto aspect-[4/7] w-full max-w-md overflow-visible">
      <RinkMarkings />

      {SLOT_ORDER.map((slot) => {
        const position = RINK_SLOT_POSITION[slot];
        return (
          <div
            key={slot}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${position.left}%`, top: `${position.top}%` }}
          >
            <PositionMarker slot={slot} accent={accent} player={lineup[slot]} />
          </div>
        );
      })}
    </div>
  );
}

const MARKER_CLASS =
  "group/marker relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-border-strong bg-surface-raised transition-all duration-300 ease-out hover:scale-110 hover:border-[var(--marker-glow)] focus-visible:scale-110 focus-visible:border-[var(--marker-glow)] focus-visible:outline-none sm:h-[72px] sm:w-[72px]";

function PositionMarker({
  slot,
  accent,
  player,
}: {
  slot: RinkSlot;
  accent: string;
  player: PlayerSummaryDTO | undefined;
}) {
  const { t } = useTranslation();
  const key = rinkSlotTranslationKey(slot);
  const slotLabel = key ? t(key) : slot;
  const glowStyle = { "--marker-glow": accent } as React.CSSProperties;

  const glow = (
    <div
      className="pointer-events-none absolute inset-0 rounded-full opacity-0 blur-lg transition-opacity duration-300 ease-out group-hover/marker:opacity-60 group-focus-visible/marker:opacity-60"
      style={{ backgroundColor: "var(--marker-glow)" }}
    />
  );

  if (!player) {
    return (
      <div className={MARKER_CLASS} style={glowStyle} role="img" aria-label={slotLabel}>
        {glow}
        <span className="font-display text-foreground-secondary group-hover/marker:text-foreground-primary relative text-sm font-bold uppercase tracking-wide transition-colors duration-300 ease-out sm:text-base">
          {slot}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={`/players/${player.id}`}
      className={MARKER_CLASS}
      style={glowStyle}
      aria-label={`${player.fullName}, #${player.jerseyNumber}, ${slotLabel}`}
    >
      {glow}
      <span className="relative flex flex-col items-center leading-none">
        <span className="font-display text-foreground-primary text-xl font-bold sm:text-2xl">
          {player.jerseyNumber}
        </span>
        <span className="font-display text-foreground-secondary mt-1 text-[10px] font-bold uppercase tracking-wide">
          {slot}
        </span>
      </span>
      <span className="border-border-subtle bg-surface-base text-foreground-primary pointer-events-none absolute top-full mt-2 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold opacity-0 transition-opacity duration-200 group-hover/marker:opacity-100 group-focus-visible/marker:opacity-100">
        {player.fullName}
      </span>
    </Link>
  );
}

function RinkMarkings() {
  return (
    <svg
      viewBox="0 0 400 700"
      className="absolute inset-0 h-full w-full"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="10"
        y="10"
        width="380"
        height="680"
        rx="60"
        stroke="#3A3A40"
        strokeWidth="2"
        fill="#0F0F11"
      />
      <line x1="10" y1="350" x2="390" y2="350" stroke="#F5F5F5" strokeWidth="2" opacity="0.5" />
      <line x1="10" y1="175" x2="390" y2="175" stroke="#3FA7D6" strokeWidth="2" opacity="0.4" />
      <line x1="10" y1="525" x2="390" y2="525" stroke="#3FA7D6" strokeWidth="2" opacity="0.4" />
      <circle cx="200" cy="350" r="45" stroke="#3A3A40" strokeWidth="1.5" opacity="0.6" />
      <circle cx="90" cy="120" r="34" stroke="#3A3A40" strokeWidth="1.5" opacity="0.5" />
      <circle cx="310" cy="120" r="34" stroke="#3A3A40" strokeWidth="1.5" opacity="0.5" />
      <circle cx="90" cy="580" r="34" stroke="#3A3A40" strokeWidth="1.5" opacity="0.5" />
      <circle cx="310" cy="580" r="34" stroke="#3A3A40" strokeWidth="1.5" opacity="0.5" />
      <path d="M 165 10 Q 200 45 235 10" stroke="#3A3A40" strokeWidth="1.5" opacity="0.6" />
      <path d="M 165 690 Q 200 655 235 690" stroke="#3A3A40" strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}
