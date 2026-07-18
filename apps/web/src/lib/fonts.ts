import { Inter, Space_Grotesk } from "next/font/google";

/** Self-hosted at build time by next/font — no runtime calls to Google's CDN. */
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["500", "600", "700"],
});
