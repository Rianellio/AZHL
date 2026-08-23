"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { LOCALES } from "@/lib/i18n/locales";
import { useLocale } from "@/lib/i18n/locale-context";
import { useTranslation } from "@/lib/i18n/use-translation";
import { cn } from "@/lib/utils";

export function LanguageSelector({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-0.5 text-xs font-semibold uppercase tracking-wide text-foreground-secondary transition-colors duration-150 hover:text-foreground-primary"
      >
        {active.label}
        <ChevronDown className={cn("h-3 w-3 transition-transform duration-150", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("nav.language")}
          className="absolute right-0 top-full z-50 mt-2 w-40 border border-border-subtle bg-surface-overlay py-1 shadow-lg"
        >
          {LOCALES.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === locale}>
              <button
                type="button"
                onClick={() => {
                  setLocale(l.code);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-medium transition-colors duration-150 hover:bg-surface-hover",
                  l.code === locale
                    ? "text-foreground-primary"
                    : "text-foreground-secondary hover:text-foreground-primary",
                )}
              >
                <span className="uppercase tracking-wide">{l.label}</span>
                <span className="text-foreground-tertiary">{l.nativeLabel}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
