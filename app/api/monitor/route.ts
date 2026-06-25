import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { isProUser } from "@/lib/access";
import { isMasterAdmin } from "@/lib/admin";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";

const supabaseUrl = getSupabaseServerUrl();

type RawSnapshot = {
  score: number;
  category_scores: Record<string, number> | null;
  scanned_at: string;
};

type RawRow = {
  id: string;
  url: string;
  label: string | null;
  frequency: "weekly" | "monthly";
  last_scanned_at: string | null;
  created_at: string;
  monitor_snapshots: RawSnapshot[];
};

export type MonitorItem = {
  id: string;
  url: string;
  label: string | null;
  frequency: "weekly" | "monthly";
  last_scanned_at: string | null;
  created_at: string;
  latest_score: number | null;
  latest_category_scores: Record<string, number> | null;
  previous_score: number | null;
  score_delta: number | null;
};

export async function GET(req: Request) {
  try {
  const auth = await getAuthContext(req);
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabaseConfig()) return NextResponse.json({ items: [] });

  const params = new URLSearchParams({
    user_id: `eq.${auth.user.id}`,
    select: "id,url,label,frequency,last_scanned_at,created_at,monitor_snapshots(score,category_scores,scanned_at)",
    order: "created_at.asc",
    "monitor_snapshots.order": "scanned_at.desc",
    "monitor_snapshots.limit": "2",
  });

  const res = await fetch(`${supabaseUrl}/rest/v1/monitored_urls?${params.toString()}`, {
    headers: getSupabaseServiceHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[monitor GET] Supabase fetch failed:", res.status, body);
    if (res.status === 404 || body.includes("relation") || body.includes("does not exist")) {
      return NextResponse.json(
        { error: "monitored_urls table does not exist. Run the database migration first." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Failed to load." }, { status: 500 });
  }

  const rows = (await res.json()) as RawRow[];

  const items: MonitorItem[] = rows.map((row) => {
    const [latest, previous] = row.monitor_snapshots ?? [];
    return {
      id: row.id,
      url: row.url,
      label: row.label,
      frequency: row.frequency,
      last_scanned_at: row.last_scanned_at,
      created_at: row.created_at,
      latest_score: latest?.score ?? null,
      latest_category_scores: latest?.category_scores ?? null,
      previous_score: previous?.score ?? null,
      score_delta: latest != null && previous != null ? latest.score - previous.score : null,
    };
  });

  return NextResponse.json({ items });
  } catch (err) {
    console.error("[monitor GET] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
  const auth = await getAuthContext(req);
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = isMasterAdmin(auth.user.email);
  if (!isAdmin && !isProUser(auth)) {
    return NextResponse.json({ error: "Monitor requires a Pro plan." }, { status: 403 });
  }

  const monitorLimit = isAdmin || auth.plan === "agency" ? 999 : auth.plan === "pro" ? 10 : 1;

  if (!hasSupabaseConfig()) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  let body: { url?: unknown; label?: unknown };
  try {
    body = (await req.json()) as { url?: unknown; label?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
  if (!rawUrl) return NextResponse.json({ error: "url is required." }, { status: 400 });

  let normalized: string;
  try {
    normalized = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`).toString();
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  // Count existing entries to enforce cap
  const countRes = await fetch(
    `${supabaseUrl}/rest/v1/monitored_urls?user_id=eq.${auth.user.id}&select=id`,
    { headers: { ...getSupabaseServiceHeaders(), Prefer: "count=exact" }, cache: "no-store" }
  );
  const contentRange = countRes.headers.get("content-range") ?? "";
  const total = parseInt(contentRange.split("/")[1] ?? "0", 10);
  if (total >= monitorLimit) {
    return NextResponse.json({ error: `Maximum ${monitorLimit} monitored URLs reached.` }, { status: 422 });
  }

  const insertRes = await fetch(`${supabaseUrl}/rest/v1/monitored_urls`, {
    method: "POST",
    headers: { ...getSupabaseServiceHeaders(), Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: auth.user.id,
      url: normalized,
      label: typeof body.label === "string" ? body.label.trim() || null : null,
      frequency: "weekly",
    }),
  });

  if (insertRes.status === 409) {
    return NextResponse.json({ error: "Already monitoring this URL." }, { status: 409 });
  }
  if (!insertRes.ok) {
    const detail = await insertRes.text().catch(() => "");
    console.error("[monitor POST] insert failed:", detail);
    return NextResponse.json({ error: "Failed to add URL." }, { status: 500 });
  }

  const [row] = (await insertRes.json()) as MonitorItem[];
  return NextResponse.json({ item: row }, { status: 201 });
  } catch (err) {
    console.error("[monitor POST] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
