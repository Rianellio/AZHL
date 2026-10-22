import { listNewsArticles } from "@/lib/server/services/news.service";
import { respondWith } from "@/lib/server/api-response";

/** Thin wrapper — no business logic here. See .claude/api-guidelines.md. */
export async function GET() {
  return respondWith(listNewsArticles);
}
