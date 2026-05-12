import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseCount = 500;
const fallbackCount = 570;

function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

function supabaseHeaders() {
  return {
    apikey: supabaseServiceRoleKey ?? "",
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
  };
}

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ count: fallbackCount, display: fallbackCount.toLocaleString("en-US") });
  }

  try {
    const countRes = await fetch(`${supabaseUrl}/rest/v1/reports?select=id`, {
      headers: {
        ...supabaseHeaders(),
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
      { headers: supabaseHeaders(), cache: "no-store" }
    );
    const statsData = (await statsRes.json()) as Array<{ value?: number }>;
    const displayCount = statsData?.[0]?.value ?? baseCount;

    const realTotal = (Number.isFinite(realCount) ? realCount : 0) + baseCount;
    const finalCount = Math.max(realTotal, displayCount);
    const rounded = Math.floor(finalCount / 10) * 10;

    if (rounded > displayCount) {
      await fetch(`${supabaseUrl}/rest/v1/app_stats?key=eq.scan_display_count`, {
        method: "PATCH",
        headers: {
          ...supabaseHeaders(),
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
