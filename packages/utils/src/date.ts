const gameDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const gameTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

/** "Sat, Nov 8" — used on schedule/game-center pages. */
export function formatGameDate(isoDate: string): string {
  return gameDateFormatter.format(new Date(isoDate));
}

/** "7:00 PM ET" — used on schedule/game-center pages. */
export function formatGameTime(isoDate: string): string {
  return gameTimeFormatter.format(new Date(isoDate));
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
