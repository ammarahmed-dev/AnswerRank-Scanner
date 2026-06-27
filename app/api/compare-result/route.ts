import { NextResponse } from "next/server";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token")?.trim();

  if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });
  if (!hasSupabaseConfig()) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const supabaseUrl = getSupabaseServerUrl();
  const params = new URLSearchParams({ share_token: `eq.${token}`, select: "result", limit: "1" });
  const res = await fetch(`${supabaseUrl}/rest/v1/compare_runs?${params.toString()}`, {
    headers: getSupabaseServiceHeaders(),
    cache: "no-store",
  });

  if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = (await res.json()) as Array<{ result?: unknown }>;
  const result = rows[0]?.result;
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(result);
}
