import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";

const supabaseUrl = getSupabaseServerUrl();

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteContext) {
  try {
    const auth = await getAuthContext(req);
    if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasSupabaseConfig()) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

    const { id } = await ctx.params;

    const params = new URLSearchParams({
      id: `eq.${id}`,
      user_id: `eq.${auth.user.id}`,
      select: "id,domain,status,total_pages,scanned_pages,aggregate_score,page_limit,total_discovered,urls,results,created_at,completed_at",
    });

    const res = await fetch(`${supabaseUrl}/rest/v1/audit_runs?${params.toString()}`, {
      headers: getSupabaseServiceHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[audit GET] Supabase error:", res.status, body);
      return NextResponse.json({ error: "Failed to load audit." }, { status: 500 });
    }

    const rows = (await res.json()) as Array<{ results?: unknown[] }>;
    if (!rows.length) return NextResponse.json({ error: "Audit not found." }, { status: 404 });

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("[audit GET] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
