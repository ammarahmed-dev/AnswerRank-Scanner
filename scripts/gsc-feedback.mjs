// scripts/gsc-feedback.mjs
// Weekly GSC feedback loop:
//   1. Striking distance: queries at position 4-20 with meaningful impressions -> action items
//   2. Decay: pages whose clicks dropped >30% vs prior 28-day window -> refresh queue
//   3. Gap mining: queries with impressions but no mapped page -> suggested new slots
//
// Env required:
//   GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY  (service account, added as user in GSC property)
//   GSC_SITE_URL                       e.g. "sc-domain:aeocheck.co" or "https://www.aeocheck.co/"
// Optional:
//   MIN_IMPRESSIONS (default 50), GAP_MIN_IMPRESSIONS (default 100)
//
// Output: reports/gsc-feedback-YYYY-MM-DD.md (+ updates content/topical-map.json refresh statuses)

import fs from "node:fs";
import path from "node:path";
import { getAccessToken } from "./lib/gsc-auth.mjs";

const SITE_URL = process.env.GSC_SITE_URL;
if (!SITE_URL) throw new Error("GSC_SITE_URL env var is required");

const MIN_IMPRESSIONS = Number(process.env.MIN_IMPRESSIONS || 50);
const GAP_MIN_IMPRESSIONS = Number(process.env.GAP_MIN_IMPRESSIONS || 100);
const MAP_PATH = path.resolve("content/topical-map.json");
const API_BASE = "https://www.googleapis.com/webmasters/v3";

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

function dateRange(daysAgoStart, daysAgoEnd) {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - daysAgoEnd);
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - daysAgoStart);
  return { startDate: fmtDate(start), endDate: fmtDate(end) };
}

async function queryGSC(token, body) {
  const url = `${API_BASE}/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GSC query failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.rows || [];
}

function loadMap() {
  return JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
}

function saveMap(map) {
  fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + "\n");
}

function slugFromUrl(url) {
  try {
    const p = new URL(url).pathname.replace(/\/$/, "");
    return p.split("/").pop() || "";
  } catch {
    return "";
  }
}

async function main() {
  const token = await getAccessToken();
  // GSC data lags ~2-3 days; offset windows accordingly.
  const current = dateRange(31, 3); // last 28 days, ending 3 days ago
  const prior = dateRange(59, 31); // the 28 days before that

  // --- 1. Striking distance (query + page level) ---
  const sdRows = await queryGSC(token, {
    ...current,
    dimensions: ["query", "page"],
    rowLimit: 5000,
  });

  const strikingDistance = sdRows
    .filter(
      (r) =>
        r.position >= 4 &&
        r.position <= 20 &&
        r.impressions >= MIN_IMPRESSIONS
    )
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 40);

  // --- 2. Decay detection (page level, current vs prior) ---
  const [curPages, priorPages] = await Promise.all([
    queryGSC(token, { ...current, dimensions: ["page"], rowLimit: 1000 }),
    queryGSC(token, { ...prior, dimensions: ["page"], rowLimit: 1000 }),
  ]);
  const priorByPage = new Map(priorPages.map((r) => [r.keys[0], r]));
  const decayed = curPages
    .map((r) => {
      const before = priorByPage.get(r.keys[0]);
      if (!before || before.clicks < 10) return null;
      const drop = (before.clicks - r.clicks) / before.clicks;
      return drop > 0.3
        ? {
            page: r.keys[0],
            clicksBefore: before.clicks,
            clicksNow: r.clicks,
            dropPct: Math.round(drop * 100),
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.dropPct - a.dropPct);

  // --- 3. Gap mining (queries with impressions, no mapped slot covers them) ---
  const map = loadMap();
  const mappedTerms = new Set();
  for (const slot of map.slots) {
    for (const q of slot.targetQueries || []) mappedTerms.add(q.toLowerCase());
    mappedTerms.add(slot.slug.replace(/-/g, " "));
  }
  const queryRows = await queryGSC(token, {
    ...current,
    dimensions: ["query"],
    rowLimit: 3000,
  });
  const gaps = queryRows
    .filter((r) => r.impressions >= GAP_MIN_IMPRESSIONS)
    .filter((r) => {
      const q = r.keys[0].toLowerCase();
      // crude containment check - good enough to surface candidates for human review
      for (const t of mappedTerms) {
        if (q.includes(t) || t.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 25);

  // --- Update topical map: flag decayed published slots for refresh ---
  let refreshFlagged = 0;
  for (const d of decayed) {
    const slug = slugFromUrl(d.page);
    const slot = map.slots.find((s) => s.slug === slug);
    if (slot && slot.status === "published") {
      slot.status = "refresh";
      slot.refreshReason = `Clicks down ${d.dropPct}% (${d.clicksBefore} -> ${d.clicksNow})`;
      refreshFlagged++;
    }
  }
  if (refreshFlagged > 0) saveMap(map);

  // --- Write report ---
  const today = fmtDate(new Date());
  const lines = [];
  lines.push(`# GSC Feedback Report - ${today}`);
  lines.push("");
  lines.push(`Window: ${current.startDate} to ${current.endDate} (vs prior 28 days)`);
  lines.push("");
  lines.push(`## Striking distance (position 4-20, >=${MIN_IMPRESSIONS} impressions)`);
  lines.push("");
  if (strikingDistance.length === 0) lines.push("None found.");
  for (const r of strikingDistance) {
    lines.push(
      `- **${r.keys[0]}** -> ${r.keys[1]} | pos ${r.position.toFixed(1)} | ${r.impressions} impr, ${r.clicks} clicks. Action: add a section directly answering this query; consider title/H2 update.`
    );
  }
  lines.push("");
  lines.push(`## Decaying pages (clicks down >30%) - ${refreshFlagged} flagged for refresh in topical-map.json`);
  lines.push("");
  if (decayed.length === 0) lines.push("None found.");
  for (const d of decayed) {
    lines.push(`- ${d.page} | ${d.clicksBefore} -> ${d.clicksNow} clicks (-${d.dropPct}%)`);
  }
  lines.push("");
  lines.push(`## Content gaps (queries with >=${GAP_MIN_IMPRESSIONS} impressions, no mapped page)`);
  lines.push("");
  if (gaps.length === 0) lines.push("None found.");
  for (const g of gaps) {
    lines.push(`- "${g.keys[0]}" | ${g.impressions} impr | pos ${g.position.toFixed(1)} -> candidate new T3 slot`);
  }
  lines.push("");

  fs.mkdirSync("reports", { recursive: true });
  const reportPath = `reports/gsc-feedback-${today}.md`;
  fs.writeFileSync(reportPath, lines.join("\n"));
  console.log(`Report written: ${reportPath}`);
  console.log(
    `striking=${strikingDistance.length} decayed=${decayed.length} gaps=${gaps.length} refreshFlagged=${refreshFlagged}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
