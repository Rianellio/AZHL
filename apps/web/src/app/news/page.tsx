import type { Metadata } from "next";
import { listNewsArticles } from "@/lib/server/services/news.service";
import { ArticleCard } from "@/components/league/article-card";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "News",
};

export default async function NewsPage() {
  const articles = await listNewsArticles();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="mb-2 font-display text-4xl font-bold text-foreground-primary">News</h1>
      <p className="mb-8 text-foreground-secondary">The latest from around the league.</p>
      {articles.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-foreground-secondary">No articles published yet.</p>
      )}
    </div>
  );
}
