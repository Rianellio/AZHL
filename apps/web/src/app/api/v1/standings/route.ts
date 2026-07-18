import { NextResponse } from "next/server";
import { getCurrentSeasonStandings } from "@/lib/server/services/standings.service";
import type { ApiResponse, StandingDTO } from "@azhl/types";

/** Thin wrapper — no business logic here. See .claude/api-guidelines.md. */
export async function GET() {
  const data = await getCurrentSeasonStandings();
  return NextResponse.json<ApiResponse<StandingDTO[]>>({ data });
}
