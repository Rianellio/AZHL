/** MOCK DATA UTILITY — see ./README.md. Deterministic string->int hash, used to seed all mock generators from a real, stable id. */
export function seedHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Deterministic integer in [min, max], seeded by `seed`. */
export function seededInt(seed: number, min: number, max: number): number {
  const x = Math.sin(seed + 1) * 10000;
  const frac = x - Math.floor(x);
  return min + Math.floor(frac * (max - min + 1));
}
