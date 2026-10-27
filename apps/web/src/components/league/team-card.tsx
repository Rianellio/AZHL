"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import type { TeamSummaryDTO } from "@azhl/types";
import { TEAM_LOGO_SRC } from "@/lib/team-logos";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { TeamLogo } from "./team-logo";

export interface TeamCardData {
  team: TeamSummaryDTO;
  /** Null until the club has played — the card shows "—", never a placeholder number. */
  standing: { rank: number; points: number } | null;
  nextGame: { opponent: TeamSummaryDTO; startTime: string; startTimeConfirmed: boolean } | null;
  rosterSize: number;
}

/**
 * One club on the /teams index — the whole card is a single link to the team page. The club's
 * own DB colors drive the background (accent glow into its primary, into the page black), and
 * the crest sits on a light "face-off circle" ringed in the accent, so every crest — including
 * Ulduz's navy mark — reads clearly on the dark page.
 */
export function TeamCard({ team, standing, nextGame, rosterSize }: TeamCardData) {
  const { t, formatGameDate, formatGameTime } = useTranslation();
  const logoSrc = TEAM_LOGO_SRC[team.slug];
  const clubColors = {
    "--club-accent": team.colors.accent,
    "--club-primary": team.colors.primary,
  } as CSSProperties;

  return (
    <Link
      href={`/teams/${team.slug}`}
      aria-label={t("teams.cardLabel", { team: team.name })}
      style={clubColors}
      className="border-border-subtle focus-visible:ring-accent focus-visible:ring-offset-surface-base group relative isolate flex flex-col justify-between gap-8 overflow-hidden rounded-lg border p-6 outline-none transition-[transform,border-color] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-1 hover:border-[var(--club-accent)] focus-visible:-translate-y-1 focus-visible:border-[var(--club-accent)] focus-visible:ring-2 focus-visible:ring-offset-4 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0 sm:p-8 lg:min-h-[max(20rem,calc((100svh_-_14rem)/2))] lg:gap-6 lg:p-7"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(90% 85% at 16% 32%, color-mix(in srgb, var(--club-accent) 42%, transparent) 0%, transparent 62%), linear-gradient(135deg, var(--club-primary) 0%, var(--color-surface-base) 72%)",
        }}
      />

      <div className="flex items-center gap-6 lg:gap-10">
        {/* Face-off circle: accent glow, accent ring, light ice disc — identical for every club. */}
        <div className="relative size-28 shrink-0 transition-transform duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-105 group-focus-visible:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-focus-visible:scale-100 sm:size-36 lg:size-44">
          <div
            aria-hidden="true"
            className="absolute -inset-6 rounded-full opacity-70 blur-2xl"
            style={{ background: "var(--club-accent)" }}
          />
          <div
            aria-hidden="true"
            className="bg-foreground-primary/95 absolute inset-0 rounded-full"
            style={{
              boxShadow: "0 0 0 4px var(--club-accent), inset 0 -10px 24px rgba(0, 0, 0, 0.14)",
            }}
          />
          {logoSrc && (
            <div className="absolute inset-[9%]">
              <Image
                src={logoSrc}
                alt=""
                fill
                sizes="(min-width: 1024px) 145px, 120px"
                className="object-contain"
              />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h2 className="font-display text-foreground-primary text-5xl font-bold uppercase leading-[0.9] tracking-tight sm:text-6xl lg:text-7xl">
            {team.name}
          </h2>
          <p className="text-foreground-secondary mt-3 text-sm font-semibold tracking-[0.2em]">
            {team.abbreviation}
          </p>
        </div>
      </div>

      <dl className="border-foreground-primary/15 grid grid-cols-3 gap-x-6 gap-y-5 border-t pt-5 lg:grid-cols-[auto_auto_1fr_auto] lg:gap-x-10">
        <Stat labelKey="teams.rank" value={standing ? String(standing.rank) : "—"} />
        <Stat labelKey="teams.points" value={standing ? String(standing.points) : "—"} />
        <div className="order-last col-span-3 flex flex-col gap-1 lg:order-none lg:col-span-1">
          <dt className="text-foreground-secondary text-xs font-medium">{t("teams.nextMatch")}</dt>
          <dd className="text-foreground-primary flex min-w-0 items-center gap-2 text-sm">
            {nextGame ? (
              <>
                {/* Same light disc as the big crest, so small dark crests stay legible. */}
                <span className="bg-foreground-primary/95 grid size-7 shrink-0 place-items-center rounded-full">
                  <TeamLogo
                    teamSlug={nextGame.opponent.slug}
                    teamName={nextGame.opponent.name}
                    size={22}
                  />
                </span>
                <span className="font-display text-lg font-semibold">
                  {nextGame.opponent.abbreviation}
                </span>
                <span className="text-foreground-secondary truncate">
                  {formatGameDate(nextGame.startTime)}
                  {nextGame.startTimeConfirmed && (
                    <> &middot; {formatGameTime(nextGame.startTime)}</>
                  )}
                </span>
              </>
            ) : (
              <span className="font-display text-2xl font-semibold">—</span>
            )}
          </dd>
        </div>
        <Stat labelKey="teams.roster" value={String(rosterSize)} />
      </dl>
    </Link>
  );
}

function Stat({ labelKey, value }: { labelKey: TranslationKey; value: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-foreground-secondary text-xs font-medium">{t(labelKey)}</dt>
      <dd className="font-display text-foreground-primary text-2xl font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  );
}

const PLURAL_KEYS: Record<string, TranslationKey> = {
  one: "teams.clubs.one",
  few: "teams.clubs.few",
  many: "teams.clubs.many",
};

/** "4 клуба · Сезон 2026/27" — plural form per locale via Intl.PluralRules. */
export function TeamsSubtitle({
  count,
  seasonLabel,
}: {
  count: number;
  seasonLabel: string | null;
}) {
  const { t, intlTag } = useTranslation();
  const clubs = t(PLURAL_KEYS[new Intl.PluralRules(intlTag).select(count)] ?? "teams.clubs.other", {
    n: count,
  });
  const season = seasonLabel ? t("teams.season", { label: seasonLabel.replace("-", "/") }) : null;
  return (
    <p className="text-foreground-secondary text-lg">
      {clubs}
      {season && <> &middot; {season}</>}
    </p>
  );
}
