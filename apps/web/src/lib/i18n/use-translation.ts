"use client";

import { useMemo } from "react";
import { useLocale } from "./locale-context";
import { DICTIONARIES } from "./dictionaries";
import type { TranslationKey } from "./dictionaries";
import type { LocaleCode } from "./locales";

/** BCP-47 tags handed to `Intl.*` — kept separate from the two-letter `LocaleCode` used
 * everywhere else, since `Intl` needs a full region tag to pick correct date/number formatting
 * conventions (e.g. Russian date order, ruble-style grouping). */
const INTL_TAG: Record<LocaleCode, string> = {
  en: "en-US",
  az: "az-Latn-AZ",
  ru: "ru-RU",
};

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/**
 * The single entry point every component uses for translated static text and locale-aware
 * formatting. Dictionaries are local, deterministic key->string lookups (see dictionaries/) —
 * no network call, no external translation service, works fully offline once the bundle loads.
 */
export function useTranslation() {
  const { locale } = useLocale();
  const intlTag = INTL_TAG[locale];
  const dictionary = DICTIONARIES[locale];

  return useMemo(() => {
    function t(key: TranslationKey, vars?: Record<string, string | number>): string {
      return interpolate(dictionary[key], vars);
    }

    function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
      const value = typeof date === "string" ? new Date(date) : date;
      return new Intl.DateTimeFormat(intlTag, options ?? { month: "long", day: "numeric", year: "numeric" }).format(
        value,
      );
    }

    function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
      return new Intl.NumberFormat(intlTag, options).format(value);
    }

    return { t, locale, intlTag, formatDate, formatNumber };
  }, [locale, intlTag, dictionary]);
}
