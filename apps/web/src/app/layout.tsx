import type { Metadata } from "next";
import { inter, spaceGrotesk } from "@/lib/fonts";
import { Shell } from "@/components/layout/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AZHL — Arctic Zone Hockey League",
    template: "%s | AZHL",
  },
  description: "Standings, schedule, scores, and news for the Arctic Zone Hockey League.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
