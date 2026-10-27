import { getCurrentSeasonSchedule } from "@/lib/server/services/schedule.service";
import { respondWith } from "@/lib/server/api-response";

/** Thin wrapper — no business logic here. See .claude/api-guidelines.md. */
export async function GET() {
  return respondWith(getCurrentSeasonSchedule);
}
