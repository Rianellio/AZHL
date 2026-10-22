"use client";

import Link from "next/link";
import { Button } from "@azhl/ui";
import { HeroVisual } from "./hero-visual";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export interface HeroProps {
  /** Translated eyebrow text. Mutually exclusive with `seasonYearRange`. */
  eyebrowKey?: TranslationKey;
  /** e.g. "2026-2027" — Hero appends the translated word for "Season" itself, since the
   * composition needs `t()` and the Server Component caller can't call hooks. */
  seasonYearRange?: string | undefined;
  /** Translated title; each "\n" in the dictionary value starts a new display line. */
  titleKey: TranslationKey;
  taglineKey?: TranslationKey;
  cta?: { labelKey: TranslationKey; href: string };
}

export function Hero({ eyebrowKey, seasonYearRange, titleKey, taglineKey, cta }: HeroProps) {
  const { t } = useTranslation();
  const eyebrowText = seasonYearRange ? `${seasonYearRange} ${t("home.seasonSuffix")}` : eyebrowKey && t(eyebrowKey);

  return (
    <section className="relative flex h-[600px] items-end overflow-hidden border-b border-border-subtle lg:h-[660px]">
      {/* Placeholder for a full-bleed hero photograph (hockey action shot per the mockup).
          HeroVisual is an entirely CSS/SVG abstract composition occupying the same box a real
          <Image fill /> will later — swapping in a real photo requires no layout change here. */}
      <div className="absolute inset-0 bg-surface-base" />
      <HeroVisual />
      <div className="absolute inset-0 bg-gradient-to-r from-surface-base via-surface-base/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-transparent to-transparent" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 pb-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">{eyebrowText}</p>
        <h1 className="max-w-2xl font-display text-6xl font-bold uppercase leading-[0.95] tracking-tight text-foreground-primary lg:text-7xl">
          {t(titleKey).split("\n").map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>
        {taglineKey && (
          <p className="text-lg font-medium uppercase tracking-wide text-foreground-secondary">
            {t(taglineKey)}
          </p>
        )}
        {cta && (
          <div className="pt-2">
            <Button asChild size="lg" className="rounded-sm">
              <Link href={cta.href}>{t(cta.labelKey)}</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
