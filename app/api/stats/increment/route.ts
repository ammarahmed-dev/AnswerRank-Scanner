import { NextResponse } from "next/server";

export const runtime = "nodejs";

// This endpoint has been removed. The display count is now maintained entirely
// server-side by /api/stats GET. Return 410 Gone for any stale callers.
export async function POST() {
  return NextResponse.json({ removed: true }, { status: 410 });
}
