import { NextResponse } from "next/server";

/** Proof-of-boot only — the real mobile API contract is documented in .claude/future-services.md. */
export function GET() {
  return NextResponse.json({ data: { status: "ok", service: "mobile-api" } });
}
