/** The three languages AZHL's UI is translated into; `code` keys the dictionaries in ./dictionaries. */
export const LOCALES = [
  { code: "en", label: "EN", nativeLabel: "English" },
  { code: "az", label: "AZ", nativeLabel: "Azərbaycan dili" },
  { code: "ru", label: "RU", nativeLabel: "Русский" },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];

/**
 * The language the server renders (and search engines index): `<html lang>`, the first paint of
 * every page, and metadata titles. A visitor's saved choice (localStorage) switches the UI after
 * hydration. Changing the site's default language is this one line.
 */
export const DEFAULT_LOCALE: LocaleCode = "ru";

export function isLocaleCode(value: string): value is LocaleCode {
  return LOCALES.some((locale) => locale.code === value);
}
