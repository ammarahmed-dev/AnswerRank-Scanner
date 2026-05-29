import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";

const supabaseUrl = getSupabaseServerUrl();

export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasSupabaseConfig()) return NextResponse.json({ audits: [] });

    const params = new URLSearchParams({
      user_id: `eq.${auth.user.id}`,
      select: "id,domain,status,total_pages,scanned_pages,aggregate_score,created_at,completed_at",
      order: "created_at.desc",
      limit: "10",
    });

    const res = await fetch(`${supabaseUrl}/rest/v1/audit_runs?${params.toString()}`, {
      headers: getSupabaseServiceHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[audit history] Supabase error:", res.status, body);
      return NextResponse.json({ error: "Failed to load audit history." }, { status: 500 });
    }

    const audits = await res.json();
    return NextResponse.json({ audits });
  } catch (err) {
    console.error("[audit history] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
