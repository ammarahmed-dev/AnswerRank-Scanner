import { createMonitorWithLimit, MonitorCreationConflict } from "@/lib/monitor-creation";
import { getScoringComparison } from "@/lib/scoring-comparison";
import { BodyTooLargeError, readJsonObject } from "@/lib/bounded-body";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { assertPublicUrl } from "@/lib/url-safety";
import { isMasterAdmin } from "@/lib/admin";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";

const supabaseUrl = getSupabaseServerUrl();

type RawSnapshot = {
  score: number;
  category_scores: Record<string, number> | null;
  scanned_at: string;
  methodology_version?: string | null;
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
    select: "id,url,label,frequency,last_scanned_at,created_at,monitor_snapshots(score,category_scores,scanned_at,methodology_version)",
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
      score_delta: latest != null && previous != null && getScoringComparison(latest.methodology_version, previous.methodology_version) === "same_method" ? latest.score - previous.score : null,
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

  // Any signed-in user may monitor; the cap below is 1 URL on Free/Starter (matches PLAN_LIMITS).
  const isAdmin = isMasterAdmin(auth.user.email);

  const monitorLimit = isAdmin || auth.plan === "agency" ? 999 : auth.plan === "pro" ? 10 : 1;

  if (!hasSupabaseConfig()) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  let body: { url?: unknown; label?: unknown };
  try {
    body = await readJsonObject(req);
  } catch (error) {
    return NextResponse.json({ error: error instanceof BodyTooLargeError ? "Request body is too large." : "Invalid request body." }, { status: error instanceof BodyTooLargeError ? 413 : 400 });
  }

  const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
  if (!rawUrl || rawUrl.length > 4096) return NextResponse.json({ error: "url is required." }, { status: 400 });

  let normalized: string;
  try {
    normalized = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`).toString();
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }
  try {
    await assertPublicUrl(normalized);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  try {
    const item = await createMonitorWithLimit({
      userId: auth.user.id, url: normalized,
      label: typeof body.label === "string" ? body.label.trim() || null : null,
      limit: monitorLimit,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof MonitorCreationConflict) {
      return error.reason === "limit"
        ? NextResponse.json({ error: `Maximum ${monitorLimit} monitored URLs reached.` }, { status: 422 })
        : NextResponse.json({ error: "Already monitoring this URL." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not add URL. Reload your monitors before retrying." }, { status: 503 });
  }
  } catch (err) {
    console.error("[monitor POST] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
