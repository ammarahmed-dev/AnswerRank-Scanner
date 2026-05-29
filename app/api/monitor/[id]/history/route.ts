import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";

const supabaseUrl = getSupabaseServerUrl();

type RouteContext = { params: Promise<{ id: string }> };

export type Snapshot = {
  id: string;
  score: number;
  category_scores: Record<string, number> | null;
  scanned_at: string;
};

export async function GET(req: Request, { params }: RouteContext) {
  const auth = await getAuthContext(req);
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabaseConfig()) return NextResponse.json({ snapshots: [] });

  const { id } = await params;

  // Verify ownership
  const ownerParams = new URLSearchParams({
    id: `eq.${id}`,
    user_id: `eq.${auth.user.id}`,
    select: "id",
    limit: "1",
  });
  const ownerRes = await fetch(`${supabaseUrl}/rest/v1/monitored_urls?${ownerParams.toString()}`, {
    headers: getSupabaseServiceHeaders(),
    cache: "no-store",
  });
  if (!ownerRes.ok) return NextResponse.json({ error: "Server error." }, { status: 500 });

  const ownerRows = (await ownerRes.json()) as Array<{ id: string }>;
  if (!ownerRows.length) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Fetch last 10 snapshots, newest first, then reverse for chart ordering
  const snapParams = new URLSearchParams({
    monitored_url_id: `eq.${id}`,
    select: "id,score,category_scores,scanned_at",
    order: "scanned_at.desc",
    limit: "10",
  });
  const snapRes = await fetch(`${supabaseUrl}/rest/v1/monitor_snapshots?${snapParams.toString()}`, {
    headers: getSupabaseServiceHeaders(),
    cache: "no-store",
  });
  if (!snapRes.ok) return NextResponse.json({ error: "Failed to load history." }, { status: 500 });

  const snapshots = (await snapRes.json()) as Snapshot[];
  // Return chronologically (oldest first) so the chart renders left-to-right
  return NextResponse.json({ snapshots: [...snapshots].reverse() });
}
