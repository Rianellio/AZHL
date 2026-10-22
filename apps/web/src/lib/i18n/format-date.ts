import type { LocaleCode } from "./locales";

/**
 * Every AZHL match is played in Baku, so every date and time on the site is shown in Baku time,
 * in every locale — identical on a UTC server and in any visitor's browser (no hydration
 * mismatch, and a 00:30 game never lands on the previous day).
 */
export const LEAGUE_TIME_ZONE = "Asia/Baku";

/**
 * Azerbaijani names. Browsers ship incomplete Intl data for `az` (Chrome renders
 * "M10 20, Tue"), so az dates are composed from this lookup; en/ru use Intl. Names are
 * lowercase, as is standard in az; weekday abbreviations are capitalized, as on az calendars.
 */
const AZ_MONTHS_LONG = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avqust",
  "sentyabr",
  "oktyabr",
  "noyabr",
  "dekabr",
] as const;
const AZ_MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"] as const;
/** Indexed by day of week (0 = Sunday). */
const AZ_WEEKDAYS_LONG = [
  "bazar",
  "bazar ertəsi",
  "çərşənbə axşamı",
  "çərşənbə",
  "cümə axşamı",
  "cümə",
  "şənbə",
] as const;
const AZ_WEEKDAYS_SHORT = ["B.", "B.e.", "Ç.a.", "Ç.", "C.a.", "C.", "Ş."] as const;

/** en-US is used only to read numeric fields in Baku time — its Intl data is complete
 * everywhere, unlike az's. */
const bakuParts = new Intl.DateTimeFormat("en-US", {
  timeZone: LEAGUE_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Calendar fields of an instant in Baku time. `month` is 0-based, `weekday` 0 = Sunday. */
export function getLeagueDateParts(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  const parts = Object.fromEntries(bakuParts.formatToParts(value).map((p) => [p.type, p.value]));
  const year = Number(parts.year);
  const month = Number(parts.month) - 1;
  const day = Number(parts.day);
  return {
    year,
    month,
    day,
    weekday: new Date(Date.UTC(year, month, day)).getUTCDay(),
    hour: parts.hour!,
    minute: parts.minute!,
  };
}

/**
 * Formats the subset of Intl.DateTimeFormatOptions the app uses (day, month, year, weekday).
 * Short weekday leads ("Ç.a., 20 okt" — same length as en/ru card dates); long weekday follows
 * CLDR's az order ("20 oktyabr, çərşənbə axşamı").
 */
function formatAzDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  const f = getLeagueDateParts(date);
  const day = options.day === "2-digit" ? String(f.day).padStart(2, "0") : String(f.day);
  const month = options.month === "short" ? AZ_MONTHS_SHORT[f.month]! : AZ_MONTHS_LONG[f.month]!;

  const datePart = [options.day && day, options.month && month, options.year && String(f.year)]
    .filter(Boolean)
    .join(" ");
  if (!options.weekday) return datePart;
  if (options.weekday === "short") {
    const weekday = AZ_WEEKDAYS_SHORT[f.weekday]!;
    return datePart ? `${weekday}, ${datePart}` : weekday;
  }
  const weekday = AZ_WEEKDAYS_LONG[f.weekday]!;
  return datePart ? `${datePart}, ${weekday}` : weekday;
}

/** Date in Baku time, in the given locale. */
export function formatLocalizedDate(
  date: Date | string,
  locale: LocaleCode,
  intlTag: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return locale === "az"
    ? formatAzDate(value, options)
    : new Intl.DateTimeFormat(intlTag, { ...options, timeZone: LEAGUE_TIME_ZONE }).format(value);
}

/** Card/schedule/game-header date: "Tue, Oct 20" / "вт, 20 окт." / "Ç.a., 20 okt". */
export function formatLocalizedGameDate(iso: string, locale: LocaleCode, intlTag: string): string {
  return formatLocalizedDate(iso, locale, intlTag, { weekday: "short", month: "short", day: "numeric" });
}

/** Face-off time in every locale: 24-hour "HH:mm" in Baku time, no zone suffix ("19:30"). */
export function formatLeagueTime(date: Date | string): string {
  const f = getLeagueDateParts(date);
  return `${f.hour}:${f.minute}`;
}
