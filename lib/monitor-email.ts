// Monitor score emails (weekly/monthly), with an alert variant when the score drops sharply.

export const SCORE_DROP_ALERT_POINTS = 5;

const SITE = "https://www.aeocheck.co";

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

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type MonitorEmailInput = {
  /** Display name: the monitor label or the domain. User-supplied, so always escaped. */
  name: string;
  url: string;
  frequency: "weekly" | "monthly";
  score: number;
  previousScore: number | null;
  categoryScores: Record<string, number>;
  previousCategoryScores?: Record<string, number> | null;
};

export function categoryDrops(current: Record<string, number>, previous?: Record<string, number> | null) {
  if (!previous) return [];
  return Object.entries(current)
    .filter(([key, value]) => typeof value === "number" && typeof previous[key] === "number" && value < previous[key])
    .map(([key, value]) => ({ key, label: CATEGORY_LABELS[key] ?? key, delta: value - previous[key] }))
    .sort((a, b) => a.delta - b.delta);
}

export function buildMonitorEmail(input: MonitorEmailInput): { subject: string; html: string; isDropAlert: boolean } {
  const { score, previousScore, categoryScores, previousCategoryScores } = input;
  const name = escapeHtml(input.name);
  const host = escapeHtml(input.url.replace(/^https?:\/\//, "").split("/")[0]);
  const grade = scoreGrade(score);
  const color = gradeColor(score);
  const delta = previousScore === null ? null : score - previousScore;
  const isDropAlert = delta !== null && -delta >= SCORE_DROP_ALERT_POINTS;
  const drops = categoryDrops(categoryScores, previousCategoryScores);

  const subject = isDropAlert
    ? `Alert: your AEO score for ${input.name} dropped ${-delta!} points`
    : input.frequency === "monthly"
      ? `Your AEO score for ${input.name} this month`
      : `Your AEO score for ${input.name} this week`;

  const deltaHtml =
    delta === null
      ? `<span style="color:#8a9ab0;font-size:14px;">First scan</span>`
      : delta === 0
        ? `<span style="color:#8a9ab0;font-size:14px;">No change from last scan</span>`
        : delta > 0
          ? `<span style="color:#00d68f;font-size:14px;">&#9650; +${delta} from last scan</span>`
          : `<span style="color:#ff4d6a;font-size:14px;">&#9660; ${delta} from last scan</span>`;

  const alertHtml = isDropAlert
    ? `
        <tr>
          <td style="padding:0 28px 20px;">
            <div style="border:1px solid #ff4d6a66;background:#ff4d6a14;border-radius:8px;padding:14px 16px;">
              <p style="margin:0 0 6px;color:#ff8fa3;font-size:14px;font-weight:800;">Your score dropped ${-delta!} points since the last scan.</p>
              <p style="margin:0;color:#cbd5e1;font-size:13px;line-height:1.55;">${
                drops.length
                  ? `Biggest changes: ${drops.slice(0, 3).map((d) => `${escapeHtml(d.label)} (${d.delta})`).join(", ")}.`
                  : "Check recent changes to this page's metadata, schema and robots.txt."
              } Re-scan the page to see exactly which checks changed.</p>
            </div>
          </td>
        </tr>`
    : "";

  const catRows = Object.entries(categoryScores)
    .filter(([, v]) => typeof v === "number")
    .map(([key, val]) => {
      const prev = previousCategoryScores?.[key];
      const change = typeof prev === "number" && prev !== val
        ? ` <span style="color:${val > prev ? "#00d68f" : "#ff4d6a"};font-weight:600;">(${val > prev ? "+" : ""}${val - prev})</span>`
        : "";
      return `
      <tr>
        <td style="padding:6px 12px;color:#8a9ab0;font-size:13px;border-bottom:1px solid #1e2a3a;">${escapeHtml(CATEGORY_LABELS[key] ?? key)}</td>
        <td style="padding:6px 12px;color:#e2e8f0;font-size:13px;font-weight:700;text-align:right;border-bottom:1px solid #1e2a3a;">${val}${change}</td>
      </tr>`;
    })
    .join("");

  const rescanUrl = `${SITE}/report?url=${encodeURIComponent(input.url)}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a1628;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#0d1e35;border:1px solid #1e2a3a;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:24px 28px 16px;border-bottom:1px solid #1e2a3a;">
            <span style="color:#00f0b4;font-size:15px;font-weight:800;letter-spacing:0.04em;">AEOCheck</span>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 20px;">
            <p style="margin:0 0 6px;color:#8a9ab0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">${host}</p>
            <h1 style="margin:0 0 16px;color:#f0f4f8;font-size:22px;font-weight:800;">${name}</h1>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:20px;vertical-align:middle;">
                  <div style="width:72px;height:72px;border-radius:50%;background:rgba(0,240,180,0.1);border:2px solid ${color};text-align:center;line-height:72px;">
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
        ${alertHtml}
        ${catRows ? `
        <tr>
          <td style="padding:0 28px 20px;">
            <p style="margin:0 0 10px;color:#8a9ab0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Category Breakdown</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1e2a3a;border-radius:8px;overflow:hidden;">
              ${catRows}
            </table>
          </td>
        </tr>` : ""}
        <tr>
          <td style="padding:8px 28px 28px;">
            <a href="${isDropAlert ? rescanUrl : `${SITE}/monitor`}"
               style="display:inline-block;background:#00f0b4;color:#0a1628;font-size:14px;font-weight:800;padding:12px 24px;border-radius:8px;text-decoration:none;">
              ${isDropAlert ? "Re-scan and see what changed &rarr;" : "View monitor dashboard &rarr;"}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px;border-top:1px solid #1e2a3a;">
            <p style="margin:0;color:#4a5568;font-size:12px;line-height:1.6;">
              You're receiving this because you added this URL to AEOCheck Monitor.
              To stop, remove the URL from your <a href="${SITE}/monitor" style="color:#00f0b4;">monitor dashboard</a>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, isDropAlert };
}
