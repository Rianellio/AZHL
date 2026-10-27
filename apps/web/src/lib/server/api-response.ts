import { NextResponse } from "next/server";
import type { ApiResponse } from "@azhl/types";

/**
 * Runs a route handler's service call and wraps the result in the `ApiResponse` envelope — `data`
 * with 200, or an `INTERNAL_ERROR` with 500 that never leaks the raw (e.g. Prisma) error.
 * See .claude/api-guidelines.md.
 */
export async function respondWith<T>(load: () => Promise<T>) {
  try {
    return NextResponse.json<ApiResponse<T>>({ data: await load() });
  } catch (error) {
    console.error("[api/v1]", error);
    return NextResponse.json<ApiResponse<T>>(
      {
        error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again later." },
      },
      { status: 500 },
    );
  }
}
