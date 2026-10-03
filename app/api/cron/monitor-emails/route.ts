// Add CRON_SECRET to Vercel environment variables (any random string).
// Schedule: daily at 9am UTC (see vercel.json). Each monitor is still scanned and emailed only
// when due (weekly: 6+ days, monthly: 28+ days since the last scan); running daily spreads the
// work so a backlog never waits a whole week.

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { runScanCore } from "@/lib/scan-core";
import { runWithBudget } from "@/lib/batch";
import { buildMonitorEmail } from "@/lib/monitor-email";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";
export const maxDuration = 300;

// Leave headroom under maxDuration for in-flight scans and emails to finish.
const SCAN_BUDGET_MS = 230_000;
const SCAN_CONCURRENCY = 4;
const DUE_FETCH_LIMIT = "100";

const supabaseUrl = getSupabaseServerUrl();

type MonitorRow = {
  id: string;
  url: string;
  label: string | null;
  user_id: string;
  frequency: "weekly" | "monthly";
  last_scanned_at: string | null;
};

type Snapshot = {
  score: number;
  category_scores: Record<string, number> | null;
  scanned_at: string;
};

async function getDueUrls(): Promise<MonitorRow[]> {
  const now = new Date();

  const weeklyThreshold = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString();
  const monthlyThreshold = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();

  const [weeklyRes, monthlyRes] = await Promise.all([
    fetch(
      `${supabaseUrl}/rest/v1/monitored_urls?${new URLSearchParams({
        frequency: "eq.weekly",
        or: `(last_scanned_at.is.null,last_scanned_at.lt.${weeklyThreshold})`,
        select: "id,url,label,user_id,frequency,last_scanned_at",
        order: "last_scanned_at.asc.nullsfirst",
        limit: DUE_FETCH_LIMIT,
      }).toString()}`,
      { headers: getSupabaseServiceHeaders(), cache: "no-store" }
    ),
    fetch(
      `${supabaseUrl}/rest/v1/monitored_urls?${new URLSearchParams({
        frequency: "eq.monthly",
        or: `(last_scanned_at.is.null,last_scanned_at.lt.${monthlyThreshold})`,
        select: "id,url,label,user_id,frequency,last_scanned_at",
        order: "last_scanned_at.asc.nullsfirst",
        limit: DUE_FETCH_LIMIT,
      }).toString()}`,
      { headers: getSupabaseServiceHeaders(), cache: "no-store" }
    ),
  ]);

  const weekly: MonitorRow[] = weeklyRes.ok ? ((await weeklyRes.json()) as MonitorRow[]) : [];
  const monthly: MonitorRow[] = monthlyRes.ok ? ((await monthlyRes.json()) as MonitorRow[]) : [];

  // Most overdue first, so anything left over when the time budget runs out is picked up next run.
  return [...weekly, ...monthly].sort(
    (a, b) => new Date(a.last_scanned_at ?? 0).getTime() - new Date(b.last_scanned_at ?? 0).getTime()
  );
}

async function getUserEmail(userId: string): Promise<string | null> {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    headers: getSupabaseServiceHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string | null };
  return data.email ?? null;
}

async function getLastSnapshots(monitoredUrlId: string): Promise<Snapshot[]> {
  const params = new URLSearchParams({
    monitored_url_id: `eq.${monitoredUrlId}`,
    order: "scanned_at.desc",
    limit: "2",
    select: "score,category_scores,scanned_at",
  });
  const res = await fetch(`${supabaseUrl}/rest/v1/monitor_snapshots?${params.toString()}`, {
    headers: getSupabaseServiceHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as Snapshot[];
}

async function saveSnapshot(monitoredUrlId: string, score: number, categoryScores: Record<string, number>) {
  const now = new Date().toISOString();

  const snapRes = await fetch(`${supabaseUrl}/rest/v1/monitor_snapshots`, {
    method: "POST",
    headers: { ...getSupabaseServiceHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify({ monitored_url_id: monitoredUrlId, score, category_scores: categoryScores, scanned_at: now }),
  });
  if (!snapRes.ok) {
    const detail = await snapRes.text().catch(() => "");
    console.error(`[cron/monitor-emails] snapshot insert failed for ${monitoredUrlId}:`, detail);
  }

  await fetch(`${supabaseUrl}/rest/v1/monitored_urls?id=eq.${monitoredUrlId}`, {
    method: "PATCH",
    headers: { ...getSupabaseServiceHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify({ last_scanned_at: now }),
  }).catch(() => null);
}


export async function GET(req: Request) {
  // Verify cron secret (required in production, optional in development)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 401 });
  }

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const resend = resendApiKey ? new Resend(resendApiKey) : null;

  const dueUrls = await getDueUrls();
  console.info(`[cron/monitor-emails] ${dueUrls.length} URLs due for scan`);

  const errors: string[] = [];
  let processed = 0;

  async function processRow(row: MonitorRow) {
    try {
      // 1. Run scan
      let scanResult: Awaited<ReturnType<typeof runScanCore>>;
      try {
        scanResult = await runScanCore(row.url, { normalizeAndValidate: false });
      } catch (err) {
        console.error(`[cron/monitor-emails] scan failed for ${row.url}:`, err);
        errors.push(`scan:${row.url}`);
        return;
      }

      const { score, categoryScores } = scanResult;

      // 2. Get previous snapshots before saving the new one
      const previousSnapshots = await getLastSnapshots(row.id);
      const previousScore = previousSnapshots[0]?.score ?? null;

      // 3. Save snapshot + update last_scanned_at
      await saveSnapshot(row.id, score, categoryScores as Record<string, number>);

      // 4. Send email if Resend is configured
      if (resend) {
        const email = await getUserEmail(row.user_id);
        if (!email) {
          console.warn(`[cron/monitor-emails] no email found for user ${row.user_id}`);
          errors.push(`email:${row.url}`);
        } else {
          try {
            let domain: string;
            try {
              domain = new URL(row.url).hostname;
            } catch {
              domain = row.label ?? row.url;
            }

            const { subject, html } = buildMonitorEmail({
              name: row.label ?? domain,
              url: row.url,
              frequency: row.frequency,
              score,
              previousScore,
              categoryScores: categoryScores as Record<string, number>,
              previousCategoryScores: previousSnapshots[0]?.category_scores ?? null,
            });

            await resend.emails.send({
              from: "AEOCheck <hello@aeocheck.co>",
              to: email,
              subject,
              html,
            });
          } catch (err) {
            console.error(`[cron/monitor-emails] email send failed for ${row.url}:`, err);
            errors.push(`email:${row.url}`);
          }
        }
      }

      processed++;
    } catch (err) {
      console.error(`[cron/monitor-emails] unexpected error for ${row.url}:`, err);
      errors.push(`unexpected:${row.url}`);
    }
  }

  const { skipped } = await runWithBudget(dueUrls, processRow, {
    concurrency: SCAN_CONCURRENCY,
    budgetMs: SCAN_BUDGET_MS,
  });

  console.info(`[cron/monitor-emails] done - processed: ${processed}, errors: ${errors.length}, deferred: ${skipped}`);
  return NextResponse.json({ processed, errors, deferred: skipped });
}
