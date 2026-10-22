import { DICTIONARIES } from "./dictionaries";
import type { TranslationKey } from "./dictionaries";
import { DEFAULT_LOCALE } from "./locales";

/**
 * Server-side lookup in the default locale — for things rendered before (or without) the client
 * locale, i.e. page metadata. UI text uses useTranslation()/<T>, which follow the visitor's choice.
 */
export function serverT(key: TranslationKey, vars?: Record<string, string | number>): string {
  const template: string = DICTIONARIES[DEFAULT_LOCALE][key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
