import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/server/db";
import type { NewsArticleDTO, NewsArticleSummaryDTO } from "@azhl/types";
import type { NewsArticle } from "@azhl/database";

function toSummary(article: NewsArticle): NewsArticleSummaryDTO {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    coverImageUrl: article.coverImageUrl,
    publishedAt: article.publishedAt.toISOString(),
  };
}

export const listNewsArticles = unstable_cache(
  async (): Promise<NewsArticleSummaryDTO[]> => {
    const articles = await prisma.newsArticle.findMany({
      orderBy: { publishedAt: "desc" },
    });
    return articles.map(toSummary);
  },
  ["news", "list"],
  { tags: ["news"], revalidate: 60 },
);

export const getNewsArticleBySlug = unstable_cache(
  async (slug: string): Promise<NewsArticleDTO | null> => {
    const article = await prisma.newsArticle.findUnique({ where: { slug } });
    if (!article) return null;
    return { ...toSummary(article), body: article.body };
  },
  ["news", "by-slug"],
  { tags: ["news"], revalidate: 60 },
);
