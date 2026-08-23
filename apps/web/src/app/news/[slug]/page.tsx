import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNewsArticleBySlug } from "@/lib/server/services/news.service";
import { ArticleDate } from "@/components/league/article-date";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getNewsArticleBySlug(slug);
  if (!article) return { title: "Article not found" };
  return { title: article.title, description: article.excerpt };
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getNewsArticleBySlug(slug);
  if (!article) notFound();

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <p className="mb-3 text-sm font-medium uppercase tracking-wide text-foreground-secondary">
        <ArticleDate iso={article.publishedAt} />
      </p>
      <h1 className="mb-8 font-display text-4xl font-bold leading-tight text-foreground-primary">
        {article.title}
      </h1>
      <div className="flex flex-col gap-4 text-lg leading-relaxed text-foreground-primary/90">
        {article.body.split("\n").map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}
