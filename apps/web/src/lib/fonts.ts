import { Inter, Oswald } from "next/font/google";

/**
 * Self-hosted at build time by next/font — no runtime calls to Google's CDN.
 * "latin-ext" renders Azerbaijani characters (e.g. the schwa "ə") and "cyrillic" the Russian UI
 * (the default locale) — without them those glyphs fall back to a system font.
 */
export const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

/** Condensed, bold — the broadcast-sports headline face matching the approved mockups. */
export const oswald = Oswald({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-oswald",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});
