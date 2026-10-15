/** Hockey stat display formatting. Every formatter takes the line's games played and returns an
 * em dash when it's zero — "no games yet" reads differently from "played, recorded nothing". */
const NO_GAMES = "—";

/** Counting stats (G, A, PTS, PIM, W, L, SO). */
export function formatCount(value: number, gamesPlayed: number): string {
  return gamesPlayed === 0 ? NO_GAMES : String(value);
}

/** "2.45". */
export function formatGoalsAgainstAverage(value: number, gamesPlayed: number): string {
  return gamesPlayed === 0 ? NO_GAMES : value.toFixed(2);
}

/** Fraction in [0, 1] → ".915" (no leading zero), or "1.000" for a perfect line. */
export function formatSavePercentage(value: number, gamesPlayed: number): string {
  if (gamesPlayed === 0) return NO_GAMES;
  const fixed = value.toFixed(3);
  return fixed.startsWith("0") ? fixed.slice(1) : fixed;
}
