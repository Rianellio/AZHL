import Link from "next/link";
import type { NewsArticleSummaryDTO } from "@azhl/types";
import { Card, CardContent } from "@/components/ui/card";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export function ArticleCard({ article }: { article: NewsArticleSummaryDTO }) {
  return (
    <Link href={`/news/${article.slug}`} className="block">
      <Card className="h-full transition-colors duration-150 hover:border-accent">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <span className="text-xs font-medium uppercase tracking-wide text-foreground-secondary">
            {dateFormatter.format(new Date(article.publishedAt))}
          </span>
          <h3 className="font-display text-lg font-semibold leading-snug text-foreground-primary">
            {article.title}
          </h3>
          <p className="text-sm text-foreground-secondary">{article.excerpt}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
