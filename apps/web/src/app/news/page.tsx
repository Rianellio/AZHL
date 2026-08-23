import type { Metadata } from "next";
import { listNewsArticles } from "@/lib/server/services/news.service";
import { ArticleCard } from "@/components/league/article-card";
import { T } from "@/components/ui/t";
import { EmptyState } from "@/components/league/empty-state";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "News",
};

export default async function NewsPage() {
  const articles = await listNewsArticles();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <T k="news.title" as="h1" className="mb-2 font-display text-4xl font-bold text-foreground-primary" />
      <T k="news.subtitle" as="p" className="mb-8 text-foreground-secondary" />
      {articles.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <EmptyState textKey="news.empty" />
      )}
    </div>
  );
}
