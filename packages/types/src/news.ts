export interface NewsArticleSummaryDTO {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  publishedAt: string;
}

export interface NewsArticleDTO extends NewsArticleSummaryDTO {
  body: string;
}
