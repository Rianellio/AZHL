"use client";

import Link from "next/link";
import { Instagram } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { LEAGUE_CONTACT } from "@/lib/league-contact";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

const LEAGUE_LINKS: { href: string; labelKey: TranslationKey }[] = [
  { href: "/league", labelKey: "footer.aboutAzhl" },
  { href: "/teams", labelKey: "nav.teams" },
  { href: "/players", labelKey: "footer.players" },
];

const INFO_LINKS: { href: string; labelKey: TranslationKey }[] = [
  { href: "/news", labelKey: "nav.news" },
  { href: "/media", labelKey: "nav.media" },
  { href: "/league#partners", labelKey: "footer.partners" },
];

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border-subtle bg-surface-overlay/40">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <Logo className="h-9" />
          <p className="text-sm text-foreground-secondary">{t("footer.tagline")}</p>
        </div>

        <FooterColumn titleKey="footer.league" links={LEAGUE_LINKS} />
        <FooterColumn titleKey="footer.information" links={INFO_LINKS} />

        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-foreground-primary">
            {t("footer.followUs")}
          </h3>
          <div className="flex items-center gap-3">
            <a
              href={LEAGUE_CONTACT.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="flex h-9 w-9 items-center justify-center border border-border-subtle text-foreground-secondary transition-colors duration-150 hover:border-accent hover:text-accent"
            >
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-border-subtle">
        <div className="mx-auto max-w-7xl px-6 py-5 text-xs text-foreground-tertiary">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  titleKey,
  links,
}: {
  titleKey: TranslationKey;
  links: { href: string; labelKey: TranslationKey }[];
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-bold uppercase tracking-wide text-foreground-primary">{t(titleKey)}</h3>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.labelKey}>
            <Link
              href={link.href}
              className="text-sm text-foreground-secondary transition-colors duration-150 hover:text-foreground-primary"
            >
              {t(link.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
