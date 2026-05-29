import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = getSupabaseServerUrl();

export type CompareRun = {
  id: string;
  url_a: string;
  url_b: string;
  score_a: number | null;
  score_b: number | null;
  created_at: string;
};

export async function GET(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabaseConfig()) return NextResponse.json({ runs: [] });

  const params = new URLSearchParams({
    user_id: `eq.${auth.user.id}`,
    order: "created_at.desc",
    limit: "10",
  });

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/compare_runs?${params.toString()}`, {
      headers: getSupabaseServiceHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ runs: [] });
    const runs = (await res.json()) as CompareRun[];
    return NextResponse.json({ runs });
  } catch {
    return NextResponse.json({ runs: [] });
  }
}
