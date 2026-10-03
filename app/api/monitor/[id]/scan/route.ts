import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { isProUser } from "@/lib/access";
import { isMasterAdmin } from "@/lib/admin";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";
import { runScanCore } from "@/lib/scan-core";

export const runtime = "nodejs";

const supabaseUrl = getSupabaseServerUrl();

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const auth = await getAuthContext(req);
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = isMasterAdmin(auth.user.email);
  if (!isAdmin && !isProUser(auth)) {
    return NextResponse.json({ error: "Requires Pro plan." }, { status: 403 });
  }

  if (!hasSupabaseConfig()) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { id } = await params;

  // Verify ownership and get URL
  const rowParams = new URLSearchParams({
    id: `eq.${id}`,
    user_id: `eq.${auth.user.id}`,
    select: "id,url",
    limit: "1",
  });
  const rowRes = await fetch(`${supabaseUrl}/rest/v1/monitored_urls?${rowParams.toString()}`, {
    headers: getSupabaseServiceHeaders(),
    cache: "no-store",
  });
  if (!rowRes.ok) return NextResponse.json({ error: "Server error." }, { status: 500 });

  const rows = (await rowRes.json()) as Array<{ id: string; url: string }>;
  if (!rows.length) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { url } = rows[0];

  let scanResult: Awaited<ReturnType<typeof runScanCore>>;
  try {
    scanResult = await runScanCore(url, { normalizeAndValidate: false });
  } catch (err) {
    console.error("[monitor/scan] runScanCore failed:", err);
    return NextResponse.json({ error: "Scan failed. The URL may be unreachable." }, { status: 500 });
  }

  const { score, categoryScores } = scanResult;
  const now = new Date().toISOString();

  const snapRes = await fetch(`${supabaseUrl}/rest/v1/monitor_snapshots`, {
    method: "POST",
    headers: { ...getSupabaseServiceHeaders(), Prefer: "return=representation" },
    body: JSON.stringify({
      monitored_url_id: id,
      score,
      category_scores: categoryScores,
      scanned_at: now,
    }),
  });

  if (!snapRes.ok) {
    const detail = await snapRes.text().catch(() => "");
    console.error("[monitor/scan] snapshot insert failed:", detail);
    return NextResponse.json({ error: "Failed to save snapshot." }, { status: 500 });
  }

  // Update last_scanned_at on the monitored URL (non-fatal if it fails)
  await fetch(`${supabaseUrl}/rest/v1/monitored_urls?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...getSupabaseServiceHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify({ last_scanned_at: now }),
  }).catch(() => null);

  const [snapshot] = (await snapRes.json()) as Array<{ id: string; score: number; scanned_at: string }>;
  return NextResponse.json({ snapshot, score }, { status: 201 });
}
