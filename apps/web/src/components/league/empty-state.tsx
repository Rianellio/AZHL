"use client";

import { useTranslation } from "@/lib/i18n/use-translation";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

/** Shared "nothing here yet" message — one translated leaf so every Server Component page can
 * drop in a localized empty state without becoming a Client Component itself. */
export function EmptyState({ textKey, className }: { textKey: TranslationKey; className?: string }) {
  const { t } = useTranslation();
  return <p className={className ?? "text-sm text-foreground-secondary"}>{t(textKey)}</p>;
}
