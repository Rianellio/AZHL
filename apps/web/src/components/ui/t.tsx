"use client";

import type { ElementType } from "react";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

/**
 * Generic inline translated text — the seam that lets Server Component pages (data-fetching,
 * no hooks allowed) drop a reactive, locale-aware string into their JSX without becoming Client
 * Components themselves. Renders `k`'s dictionary value as `as` (default `span`), a plain string
 * with no wrapper for the common `<h1><T k="..." /></h1>` case handled by the caller's own tag.
 */
export function T({
  k,
  vars,
  as: Tag = "span",
  className,
}: {
  k: TranslationKey;
  vars?: Record<string, string | number>;
  as?: ElementType;
  className?: string;
}) {
  const { t } = useTranslation();
  if (!className && Tag === "span") return <>{t(k, vars)}</>;
  return <Tag className={className}>{t(k, vars)}</Tag>;
}
