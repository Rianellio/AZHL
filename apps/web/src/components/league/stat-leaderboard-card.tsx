"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TeamLogo } from "./team-logo";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export interface LeaderboardEntry {
  id: string;
  teamSlug: string;
  teamName: string;
  primary: string;
  /** Skater rows only — composed client-side as "{position} — {team}" so the position label
   * stays reactive to locale changes instead of being baked into a server-rendered string. */
  positionKey?: TranslationKey | undefined;
  /** Goalie rows: just the team name, no position. Skipped when `positionKey` is set. */
  secondaryTeamName?: string | undefined;
  value: string;
}

/**
 * One stat category — Goals, Assists, Points, Goalies, Goals For, Goals Against, Power Play,
 * Penalty Kill. Renders a ranked list when real leaders exist; otherwise a plain empty state
 * rather than picking arbitrary names/teams out of a tie at zero. The caller decides what
 * counts as "real" (see app/stats/page.tsx) — this component only ever renders what it's given.
 */
export function StatLeaderboardCard({
  titleKey,
  abbreviationKey,
  entries,
  emptyMessageKey,
}: {
  titleKey: TranslationKey;
  abbreviationKey: TranslationKey;
  entries: LeaderboardEntry[];
  emptyMessageKey: TranslationKey;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <h3 className="font-display text-base font-bold uppercase tracking-wide text-foreground-primary">
            {t(titleKey)}
          </h3>
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">
            {t(abbreviationKey)}
          </span>
        </div>

        {entries.length > 0 ? (
          <ol className="flex flex-col gap-3">
            {entries.map((entry, index) => (
              <li key={entry.id} className="flex items-center gap-3">
                <span className="w-4 text-xs font-semibold text-foreground-tertiary">{index + 1}</span>
                <TeamLogo teamSlug={entry.teamSlug} teamName={entry.teamName} size={24} />
                <div className="flex flex-1 flex-col leading-tight">
                  <span className="text-sm font-medium text-foreground-primary">{entry.primary}</span>
                  {entry.positionKey ? (
                    <span className="text-xs text-foreground-tertiary">
                      {t(entry.positionKey)} — {entry.teamName}
                    </span>
                  ) : (
                    entry.secondaryTeamName && (
                      <span className="text-xs text-foreground-tertiary">{entry.secondaryTeamName}</span>
                    )
                  )}
                </div>
                <span className="font-display text-base font-bold text-accent">{entry.value}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm leading-relaxed text-foreground-secondary">{t(emptyMessageKey)}</p>
        )}
      </CardContent>
    </Card>
  );
}
