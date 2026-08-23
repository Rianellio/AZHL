"use client";

import Link from "next/link";
import type { NewsArticleSummaryDTO } from "@azhl/types";
import { Card, CardContent } from "@/components/ui/card";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { ArticleDate } from "./article-date";
import { useTranslation } from "@/lib/i18n/use-translation";

export function ArticleCard({ article }: { article: NewsArticleSummaryDTO }) {
  const { t } = useTranslation();
  return (
    <Link href={`/news/${article.slug}`} className="block">
      <Card className="h-full overflow-hidden transition-colors duration-150 hover:border-accent">
        <ImagePlaceholder ratio="aspect-[16/10]" />
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <span className="text-xs font-medium uppercase tracking-wide text-foreground-secondary">
            <ArticleDate iso={article.publishedAt} />
          </span>
          <h3 className="font-display text-lg font-semibold uppercase leading-snug text-foreground-primary">
            {article.title}
          </h3>
          <span className="mt-auto pt-1 text-xs font-semibold uppercase tracking-wide text-accent">
            {t("common.readMore")}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
