import type { Metadata } from "next";
import { inter, oswald } from "@/lib/fonts";
import { Shell } from "@/components/layout/shell";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AZHL — Azerbaijan Hockey League",
    template: "%s | AZHL",
  },
  description: "Standings, schedule, scores, and news for the Azerbaijan Hockey League.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${oswald.variable}`}>
      <body>
        <LocaleProvider>
          <Shell>{children}</Shell>
        </LocaleProvider>
      </body>
    </html>
  );
}
