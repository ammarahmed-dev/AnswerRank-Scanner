import { NextResponse } from "next/server";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";

const supabaseUrl = getSupabaseServerUrl();
const baseCount = 500;
const fallbackCount = 570;

// Throttle the display-count write to at most once per 60 s across concurrent requests.
let lastDisplayCountWrite = 0;
const DISPLAY_COUNT_WRITE_INTERVAL_MS = 60_000;

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ count: fallbackCount, display: fallbackCount.toLocaleString("en-US") });
  }

  try {
    const countRes = await fetch(`${supabaseUrl}/rest/v1/reports?select=id`, {
      headers: {
        ...getSupabaseServiceHeaders(),
        Prefer: "count=exact",
        "Range-Unit": "items",
        Range: "0-0",
      },
      cache: "no-store",
    });

    const rangeHeader = countRes.headers.get("content-range");
    const realCount = rangeHeader ? Number.parseInt(rangeHeader.split("/")[1] ?? "0", 10) : 0;

    const statsRes = await fetch(
      `${supabaseUrl}/rest/v1/app_stats?key=eq.scan_display_count&select=value`,
      { headers: getSupabaseServiceHeaders(), cache: "no-store" }
    );
    const statsData = (await statsRes.json()) as Array<{ value?: number }>;
    const displayCount = statsData?.[0]?.value ?? baseCount;

    const realTotal = (Number.isFinite(realCount) ? realCount : 0) + baseCount;
    const finalCount = Math.max(realTotal, displayCount);
    const rounded = Math.floor(finalCount / 10) * 10;

    const now = Date.now();
    if (rounded > displayCount && now - lastDisplayCountWrite > DISPLAY_COUNT_WRITE_INTERVAL_MS) {
      lastDisplayCountWrite = now;
      await fetch(`${supabaseUrl}/rest/v1/app_stats?key=eq.scan_display_count`, {
        method: "PATCH",
        headers: {
          ...getSupabaseServiceHeaders(),
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          value: rounded,
          updated_at: new Date().toISOString(),
        }),
      });
    }

    return NextResponse.json({
      count: finalCount,
      display: finalCount.toLocaleString("en-US"),
    });
  } catch {
    return NextResponse.json({ count: fallbackCount, display: fallbackCount.toLocaleString("en-US") });
  }
}
