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
  share_token: string | null;
  created_at: string;
};

type CompareRunRow = {
  id: string;
  url_a: string;
  url_b: string;
  share_token: string | null;
  created_at: string;
  result: { comparison?: { primaryScore?: number; competitorScore?: number } } | null;
};

export async function GET(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabaseConfig()) return NextResponse.json({ runs: [] });

  const params = new URLSearchParams({
    user_id: `eq.${auth.user.id}`,
    select: "id,url_a,url_b,share_token,created_at,result",
    order: "created_at.desc",
    limit: "10",
  });

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/compare_runs?${params.toString()}`, {
      headers: getSupabaseServiceHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ runs: [] });
    const rows = (await res.json()) as CompareRunRow[];
    const runs: CompareRun[] = rows.map((row) => ({
      id: row.id,
      url_a: row.url_a,
      url_b: row.url_b,
      share_token: row.share_token ?? null,
      score_a: row.result?.comparison?.primaryScore ?? null,
      score_b: row.result?.comparison?.competitorScore ?? null,
      created_at: row.created_at,
    }));
    return NextResponse.json({ runs });
  } catch {
    return NextResponse.json({ runs: [] });
  }
}
