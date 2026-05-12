import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    app: "aeocheck-scanner",
    time: new Date().toISOString(),
  });
}


