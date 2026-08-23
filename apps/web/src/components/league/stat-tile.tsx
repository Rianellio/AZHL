"use client";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export function StatTile({
  labelKey,
  value,
  className,
}: {
  labelKey: TranslationKey;
  value: string | number;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={cn("rounded-lg border border-border-subtle bg-surface-raised p-4", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-foreground-secondary">
        {t(labelKey)}
      </p>
      <p className="mt-1 font-display text-2xl font-bold text-foreground-primary">{value}</p>
    </div>
  );
}
