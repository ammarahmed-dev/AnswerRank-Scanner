import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

export async function POST() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ success: false });
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/app_stats?key=eq.scan_display_count&select=value`, {
      headers: supabaseHeaders(),
      cache: "no-store",
    });
    const data = (await res.json()) as Array<{ value?: number }>;
    const current = data?.[0]?.value ?? fallbackCount;
    const next = current + 1;

    await fetch(`${supabaseUrl}/rest/v1/app_stats?key=eq.scan_display_count`, {
      method: "PATCH",
      headers: {
        ...supabaseHeaders(),
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        value: next,
        updated_at: new Date().toISOString(),
      }),
    });

    return NextResponse.json({ success: true, newValue: next });
  } catch {
    return NextResponse.json({ success: false });
  }
}
