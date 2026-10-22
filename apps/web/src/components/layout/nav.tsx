"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@azhl/ui";
import { Logo } from "@/components/ui/logo";
import { LanguageSelector } from "./language-selector";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

const LINKS: { href: string; labelKey: TranslationKey }[] = [
  { href: "/league", labelKey: "nav.league" },
  { href: "/teams", labelKey: "nav.teams" },
  { href: "/schedule", labelKey: "nav.schedule" },
  { href: "/standings", labelKey: "nav.standings" },
  { href: "/stats", labelKey: "nav.stats" },
  { href: "/news", labelKey: "nav.news" },
  { href: "/media", labelKey: "nav.media" },
  { href: "/contacts", labelKey: "nav.contacts" },
];

export function Nav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-surface-base/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6">
        <Link href="/" className="flex shrink-0 items-center" onClick={() => setOpen(false)}>
          <Logo className="h-10" priority />
        </Link>

        <nav className="hidden items-center gap-5 lg:flex" aria-label={t("nav.primaryLabel")}>
          {LINKS.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "text-xs font-semibold uppercase tracking-wide transition-colors duration-150",
                  isActive
                    ? "text-foreground-primary"
                    : "text-foreground-secondary hover:text-foreground-primary",
                )}
              >
                {t(link.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-4 lg:flex">
          <Button asChild size="sm" className="rounded-sm">
            <Link href="/contacts">{t("nav.join")}</Link>
          </Button>
          <LanguageSelector />
        </div>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-md text-foreground-primary lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={t(open ? "nav.closeMenu" : "nav.openMenu")}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          className="border-t border-border-subtle px-6 py-4 lg:hidden"
          aria-label={t("nav.primaryLabel")}
        >
          <ul className="flex flex-col gap-4">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-semibold uppercase tracking-wide text-foreground-primary"
                  onClick={() => setOpen(false)}
                >
                  {t(link.labelKey)}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Button asChild size="sm" className="w-full rounded-sm">
                <Link href="/contacts" onClick={() => setOpen(false)}>
                  {t("nav.join")}
                </Link>
              </Button>
            </li>
            <li className="flex items-center justify-between border-t border-border-subtle pt-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">
                {t("nav.language")}
              </span>
              <LanguageSelector />
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
