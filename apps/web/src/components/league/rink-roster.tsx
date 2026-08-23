"use client";

import { RINK_SLOT_POSITION, type RinkSlot } from "@/lib/mock/rink-positions";
import { rinkSlotTranslationKey } from "@/lib/i18n/position-key";
import { useTranslation } from "@/lib/i18n/use-translation";

const SLOT_ORDER: RinkSlot[] = ["G", "LD", "RD", "LW", "C", "RW"];

/**
 * Position-only lineup template — no player data at all right now (see requirements: no
 * names yet, hover animation only). Once the CMS exists, each marker becomes a real player
 * (photo, number, name, click-through to their profile) without this rink layout changing;
 * only the content of each marker gets swapped.
 */
export function RinkRoster({ accent }: { accent: string }) {
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
            <PositionMarker slot={slot} accent={accent} />
          </div>
        );
      })}
    </div>
  );
}

function PositionMarker({ slot, accent }: { slot: RinkSlot; accent: string }) {
  const { t } = useTranslation();
  const key = rinkSlotTranslationKey(slot);
  return (
    <div
      className="group/marker relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-border-strong bg-surface-raised transition-all duration-300 ease-out hover:scale-110 hover:border-[var(--marker-glow)] sm:h-[72px] sm:w-[72px]"
      style={{ "--marker-glow": accent } as React.CSSProperties}
      role="img"
      aria-label={key ? t(key) : slot}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-full opacity-0 blur-lg transition-opacity duration-300 ease-out group-hover/marker:opacity-60"
        style={{ backgroundColor: "var(--marker-glow)" }}
      />
      <span className="relative font-display text-sm font-bold uppercase tracking-wide text-foreground-secondary transition-colors duration-300 ease-out group-hover/marker:text-foreground-primary sm:text-base">
        {slot}
      </span>
    </div>
  );
}

function RinkMarkings() {
  return (
    <svg viewBox="0 0 400 700" className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
      <rect x="10" y="10" width="380" height="680" rx="60" stroke="#3A3A40" strokeWidth="2" fill="#0F0F11" />
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
