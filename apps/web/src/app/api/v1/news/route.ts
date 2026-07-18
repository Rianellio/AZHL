import { NextResponse } from "next/server";
import { listNewsArticles } from "@/lib/server/services/news.service";
import type { ApiResponse, NewsArticleSummaryDTO } from "@azhl/types";

/** Thin wrapper — no business logic here. See .claude/api-guidelines.md. */
export async function GET() {
  const data = await listNewsArticles();
  return NextResponse.json<ApiResponse<NewsArticleSummaryDTO[]>>({ data });
}
