/** "Sat, Nov 8" — used on schedule/game-center pages. `locale` defaults to "en-US" so existing
 * callers that don't pass one keep their current output; locale-aware callers (see
 * lib/i18n/use-translation.ts's `intlTag`) pass the active UI locale for translated weekday/
 * month names. */
export function formatGameDate(isoDate: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(isoDate));
}

/** "7:00 PM ET" — used on schedule/game-center pages. */
export function formatGameTime(isoDate: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(isoDate));
}

export function isSameDay(a: string, b: string): boolean {
  const dateA = new Date(a);
  const dateB = new Date(b);
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}
