/**
 * The three languages AZHL's UI will eventually be fully translated into. Only the selector
 * (see language-selector.tsx) is wired up today — no dictionary/translation lookup exists yet,
 * so page copy stays English regardless of the active locale. `code` values are the keys a
 * future translation system would key its dictionaries on.
 */
export const LOCALES = [
  { code: "en", label: "EN", nativeLabel: "English" },
  { code: "az", label: "AZ", nativeLabel: "Azərbaycan dili" },
  { code: "ru", label: "RU", nativeLabel: "Русский" },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: LocaleCode = "en";

export function isLocaleCode(value: string): value is LocaleCode {
  return LOCALES.some((locale) => locale.code === value);
}
