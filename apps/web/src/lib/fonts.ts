import { Inter, Oswald } from "next/font/google";

/**
 * Self-hosted at build time by next/font — no runtime calls to Google's CDN.
 * "latin-ext" is required (not just "latin") to correctly render Azerbaijani characters
 * (e.g. the schwa "ə") that will appear in real team/player names once the CMS is live.
 */
export const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

/** Condensed, bold — the broadcast-sports headline face matching the approved mockups. */
export const oswald = Oswald({
  subsets: ["latin", "latin-ext"],
  variable: "--font-oswald",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});
