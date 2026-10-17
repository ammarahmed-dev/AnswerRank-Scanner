import { NextResponse } from "next/server";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";
export const revalidate = 60;

const supabaseUrl = getSupabaseServerUrl();

// Returns the real number of stored reports. No baseline is added and nothing is persisted, so the
// public count can go down if rows are deleted. When the count cannot be read, `count` is null.
export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ count: null, display: null });
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
    const count = rangeHeader ? Number.parseInt(rangeHeader.split("/")[1] ?? "", 10) : NaN;
    if (!countRes.ok || !Number.isFinite(count)) {
      return NextResponse.json({ count: null, display: null });
    }

    return NextResponse.json({ count, display: count.toLocaleString("en-US") });
  } catch {
    return NextResponse.json({ count: null, display: null });
  }
}
