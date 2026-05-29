// NOTE: Vercel cron jobs require a Pro/paid Vercel plan.
// Add CRON_SECRET to Vercel environment variables (any random string).
// Schedule: every Monday at 9am UTC (see vercel.json).

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { runScanCore } from "@/lib/scan-core";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";
export const maxDuration = 300;

const supabaseUrl = getSupabaseServerUrl();

const CATEGORY_LABELS: Record<string, string> = {
  schema: "Schema",
  metadata: "Metadata",
  contentClarity: "Content Clarity",
  performance: "Performance",
  trustSignals: "Trust Signals",
  aiReadiness: "AI Readiness",
  headings: "Headings",
};

function scoreGrade(score: number): string {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  return "D";
}

function gradeColor(score: number): string {
  if (score >= 85) return "#00d68f";
  if (score >= 70) return "#00f0b4";
  if (score >= 50) return "#ffb830";
  return "#ff4d6a";
}

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
        limit: "50",
      }).toString()}`,
      { headers: getSupabaseServiceHeaders(), cache: "no-store" }
    ),
    fetch(
      `${supabaseUrl}/rest/v1/monitored_urls?${new URLSearchParams({
        frequency: "eq.monthly",
        or: `(last_scanned_at.is.null,last_scanned_at.lt.${monthlyThreshold})`,
        select: "id,url,label,user_id,frequency,last_scanned_at",
        limit: "50",
      }).toString()}`,
      { headers: getSupabaseServiceHeaders(), cache: "no-store" }
    ),
  ]);

  const weekly: MonitorRow[] = weeklyRes.ok ? ((await weeklyRes.json()) as MonitorRow[]) : [];
  const monthly: MonitorRow[] = monthlyRes.ok ? ((await monthlyRes.json()) as MonitorRow[]) : [];

  return [...weekly, ...monthly].slice(0, 50);
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

function buildEmailHtml(opts: {
  domain: string;
  url: string;
  score: number;
  previousScore: number | null;
  categoryScores: Record<string, number>;
}): string {
  const { domain, score, previousScore, categoryScores } = opts;
  const grade = scoreGrade(score);
  const color = gradeColor(score);

  const delta =
    previousScore === null
      ? null
      : score - previousScore;

  const deltaHtml =
    delta === null
      ? `<span style="color:#8a9ab0;font-size:14px;">First scan</span>`
      : delta === 0
      ? `<span style="color:#8a9ab0;font-size:14px;">No change from last scan</span>`
      : delta > 0
      ? `<span style="color:#00d68f;font-size:14px;">▲ +${delta} from last scan</span>`
      : `<span style="color:#ff4d6a;font-size:14px;">▼ ${delta} from last scan</span>`;

  const catRows = Object.entries(categoryScores)
    .filter(([, v]) => typeof v === "number")
    .map(
      ([key, val]) => `
      <tr>
        <td style="padding:6px 12px;color:#8a9ab0;font-size:13px;border-bottom:1px solid #1e2a3a;">${CATEGORY_LABELS[key] ?? key}</td>
        <td style="padding:6px 12px;color:#e2e8f0;font-size:13px;font-weight:700;text-align:right;border-bottom:1px solid #1e2a3a;">${val}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a1628;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#0d1e35;border:1px solid #1e2a3a;border-radius:12px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="padding:24px 28px 16px;border-bottom:1px solid #1e2a3a;">
            <span style="color:#00f0b4;font-size:15px;font-weight:800;letter-spacing:0.04em;">AEOCheck</span>
          </td>
        </tr>

        <!-- Domain + score -->
        <tr>
          <td style="padding:28px 28px 20px;">
            <p style="margin:0 0 6px;color:#8a9ab0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">
              ${opts.url.replace(/^https?:\/\//, "").split("/")[0]}
            </p>
            <h1 style="margin:0 0 16px;color:#f0f4f8;font-size:22px;font-weight:800;">${domain}</h1>

            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:20px;vertical-align:middle;">
                  <div style="width:72px;height:72px;border-radius:50%;background:rgba(0,240,180,0.1);border:2px solid ${color};display:flex;align-items:center;justify-content:center;text-align:center;line-height:1;">
                    <span style="color:${color};font-size:26px;font-weight:900;">${score}</span>
                  </div>
                </td>
                <td style="vertical-align:middle;">
                  <div style="background:${color}22;border:1px solid ${color}55;border-radius:6px;padding:3px 10px;display:inline-block;margin-bottom:6px;">
                    <span style="color:${color};font-size:13px;font-weight:700;">Grade ${grade}</span>
                  </div>
                  <br>${deltaHtml}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Category scores -->
        ${catRows ? `
        <tr>
          <td style="padding:0 28px 20px;">
            <p style="margin:0 0 10px;color:#8a9ab0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Category Breakdown</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1e2a3a;border-radius:8px;overflow:hidden;">
              ${catRows}
            </table>
          </td>
        </tr>` : ""}

        <!-- CTA -->
        <tr>
          <td style="padding:8px 28px 28px;">
            <a href="https://aeocheck.co/monitor"
               style="display:inline-block;background:#00f0b4;color:#0a1628;font-size:14px;font-weight:800;padding:12px 24px;border-radius:8px;text-decoration:none;">
              View monitor dashboard →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 28px;border-top:1px solid #1e2a3a;">
            <p style="margin:0;color:#4a5568;font-size:12px;line-height:1.6;">
              You're receiving this because you added this URL to AEOCheck Monitor.
              To stop, remove the URL from your <a href="https://aeocheck.co/monitor" style="color:#00f0b4;">monitor dashboard</a>.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
  console.log(`[cron/monitor-emails] ${dueUrls.length} URLs due for scan`);

  const errors: string[] = [];
  let processed = 0;

  for (const row of dueUrls) {
    try {
      // 1. Run scan
      let scanResult: Awaited<ReturnType<typeof runScanCore>>;
      try {
        scanResult = await runScanCore(row.url, { normalizeAndValidate: false });
      } catch (err) {
        console.error(`[cron/monitor-emails] scan failed for ${row.url}:`, err);
        errors.push(`scan:${row.url}`);
        continue;
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

            const subject =
              row.frequency === "monthly"
                ? `Your AEO score for ${domain} this month`
                : `Your AEO score for ${domain} this week`;

            await resend.emails.send({
              from: "AEOCheck <hello@aeocheck.co>",
              to: email,
              subject,
              html: buildEmailHtml({
                domain: row.label ?? domain,
                url: row.url,
                score,
                previousScore,
                categoryScores: categoryScores as Record<string, number>,
              }),
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

  console.log(`[cron/monitor-emails] done — processed: ${processed}, errors: ${errors.length}`);
  return NextResponse.json({ processed, errors });
}
