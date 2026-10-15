/** "82" -> "82 GP" style helpers for stat-dense standings/box-score tables. */
export function formatRecord(wins: number, losses: number, shootoutLosses: number): string {
  return `${wins}-${losses}-${shootoutLosses}`;
}

export function formatPlusMinus(value: number): string {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}
