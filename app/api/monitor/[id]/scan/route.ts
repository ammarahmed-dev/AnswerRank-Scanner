import { saveMonitorSnapshot } from "@/lib/monitor-persistence";
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
  try {
    const snapshot = await saveMonitorSnapshot({
      monitorId: id, userId: auth.user.id, score,
      categoryScores: categoryScores as Record<string, number>, methodologyVersion: scanResult.methodology?.version,
    });
    return NextResponse.json({ snapshot, score }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save monitor scan. Please retry." }, { status: 503 });
  }
}
