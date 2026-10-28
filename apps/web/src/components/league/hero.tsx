"use client";

import Link from "next/link";
import { Button } from "@azhl/ui";
import { HeroVisual } from "./hero-visual";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export interface HeroProps {
  eyebrowKey?: TranslationKey;
  seasonYearRange?: string | undefined;
  titleKey: TranslationKey;
  taglineKey?: TranslationKey;
  cta?: { labelKey: TranslationKey; href: string };
}

export function Hero({ eyebrowKey, seasonYearRange, titleKey, taglineKey, cta }: HeroProps) {
  const { t } = useTranslation();
  const eyebrowText = seasonYearRange
    ? `${seasonYearRange} ${t("home.seasonSuffix")}`
    : eyebrowKey && t(eyebrowKey);

  return (
    <section className="relative flex h-[600px] items-end overflow-hidden border-b border-border-subtle lg:h-[660px]">
      <div className="absolute inset-0 bg-surface-base" />

      <HeroVisual />

      <div className="pointer-events-none absolute inset-0 w-full bg-gradient-to-r from-surface-base via-surface-base/60 to-transparent lg:w-[60%]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-surface-base to-transparent" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 pb-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          {eyebrowText}
        </p>
        <h1 className="max-w-2xl font-display text-5xl font-bold uppercase leading-[1.08] tracking-normal text-foreground-primary sm:text-6xl lg:text-7xl">
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