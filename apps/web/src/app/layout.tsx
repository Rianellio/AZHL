import type { Metadata } from "next";
import { inter, oswald } from "@/lib/fonts";
import { Shell } from "@/components/layout/shell";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { SITE_URL } from "@/lib/site-url";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";
import { serverT } from "@/lib/i18n/server";
import "./globals.css";

const DESCRIPTION = serverT("meta.description");

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: {
    default: "AZHL — Azerbaijan Hockey League",
    template: "%s | AZHL",
  },
  description: DESCRIPTION,
  // app/opengraph-image.jpg is picked up automatically as the default share image.
  openGraph: {
    type: "website",
    siteName: "AZHL — Azerbaijan Hockey League",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE} className={`${inter.variable} ${oswald.variable}`}>
      <body>
        <LocaleProvider>
          <Shell>{children}</Shell>
        </LocaleProvider>
      </body>
    </html>
  );
}
