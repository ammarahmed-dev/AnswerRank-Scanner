import { loadScanRows } from "@/lib/scan-resource";
import { saveMonitorSnapshot } from "@/lib/monitor-persistence";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { isProUser } from "@/lib/access";
import { isMasterAdmin } from "@/lib/admin";
import { getSupabaseServerUrl, hasSupabaseConfig } from "@/lib/supabase-config";
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
  let rows: Array<{ id: string; url: string }>;
  try {
    rows = await loadScanRows(`${supabaseUrl}/rest/v1/monitored_urls?${rowParams.toString()}`, 16_384, req.signal) as typeof rows;
    req.signal.throwIfAborted();
    if (rows.length && (!rows[0] || rows[0].id !== id || typeof rows[0].url !== "string")) throw new Error("Invalid monitor.");
  } catch {
    return NextResponse.json({ error: req.signal.aborted ? "Request cancelled." : "Failed to load monitor." }, { status: req.signal.aborted ? 499 : 503 });
  }
  if (!rows.length) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { url } = rows[0];

  let scanResult: Awaited<ReturnType<typeof runScanCore>>;
  const deadline = AbortSignal.timeout(30_000);
  const signal = AbortSignal.any([req.signal, deadline]);
  try {
    signal.throwIfAborted();
    scanResult = await runScanCore(url, { normalizeAndValidate: false, signal });
    signal.throwIfAborted();
  } catch (err) {
    if (req.signal.aborted) return NextResponse.json({ error: "Request cancelled." }, { status: 499 });
    if (deadline.aborted) return NextResponse.json({ error: "Monitor scan timed out." }, { status: 504 });
    console.error("[monitor/scan] runScanCore failed:", err instanceof Error ? err.name : "Unknown error");
    return NextResponse.json({ error: "Scan failed. The URL may be unreachable." }, { status: 500 });
  }

  const { score, categoryScores } = scanResult;
  // Once dispatched, let the atomic save settle; cancellation cannot prove a rollback.
  if (req.signal.aborted) return NextResponse.json({ error: "Request cancelled." }, { status: 499 });
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
