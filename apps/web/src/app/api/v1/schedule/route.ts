import { NextResponse } from "next/server";
import { getCurrentSeasonSchedule } from "@/lib/server/services/schedule.service";
import type { ApiResponse, GameDTO } from "@azhl/types";

/** Thin wrapper — no business logic here. See .claude/api-guidelines.md. */
export async function GET() {
  const data = await getCurrentSeasonSchedule();
  return NextResponse.json<ApiResponse<GameDTO[]>>({ data });
}
