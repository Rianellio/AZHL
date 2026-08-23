"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export function SectionHeader({
  titleKey,
  action,
}: {
  titleKey: TranslationKey;
  action?: { labelKey: TranslationKey; href: string };
}) {
  const { t } = useTranslation();
  return (
    <div className="mb-4 flex items-center justify-between border-b border-border-subtle pb-3">
      <h2 className="font-display text-xl font-bold uppercase tracking-wide text-foreground-primary">
        {t(titleKey)}
      </h2>
      {action && (
        <Link
          href={action.href}
          className="text-xs font-semibold uppercase tracking-wide text-accent transition-colors duration-150 hover:text-accent-hover"
        >
          {t(action.labelKey)}
        </Link>
      )}
    </div>
  );
}
