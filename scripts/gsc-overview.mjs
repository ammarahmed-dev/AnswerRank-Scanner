// scripts/gsc-overview.mjs
// Read-only Search Console snapshot printed to the job log: sitemap status, daily trend, top
// queries/pages, tool pages, devices and countries. Run manually via the "GSC Overview" workflow.
//
// Env required: GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY, GSC_SITE_URL
// Optional: DAYS (default 28)

import { getAccessToken } from "./lib/gsc-auth.mjs";
import { overviewRange, opportunityQueries, collectEvidence, evidenceLine } from "./lib/gsc-opportunities.mjs";

const SITE = process.env.GSC_SITE_URL;
if (!SITE) throw new Error("GSC_SITE_URL env var is required");
const RANGE = overviewRange(process.env.DAYS || 28);
const API = "https://www.googleapis.com/webmasters/v3";

async function call(token, path, init) {
  const res = await fetch(`${API}/sites/${encodeURIComponent(SITE)}${path}`, {
    ...init,
    signal: AbortSignal.timeout(30_000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`GSC ${path} failed (${res.status}): ${res.statusText}`);
  return res.json();
}

const query = (token, body) => call(token, "/searchAnalytics/query", { method: "POST", body: JSON.stringify({ ...RANGE, type: "web", dataState: "final", rowLimit: 25, ...body }) }).then((d) => d.rows || []);
const row = (r, n = 1) => `${r.keys.slice(0, n).join(" | ").slice(0, 90).padEnd(90)} clicks ${String(r.clicks).padStart(4)} impr ${String(r.impressions).padStart(6)} ctr ${(r.ctr * 100).toFixed(1).padStart(5)}% pos ${r.position.toFixed(1).padStart(5)}`;

async function section(title, fn) {
  console.log(`\n== ${title}`);
  try { await fn(); } catch (e) { console.log(`(failed: ${e.message})`); process.exitCode = 1; }
}

const token = await getAccessToken({ readOnly: true });
console.log(`GSC overview for ${SITE}, ${JSON.stringify(RANGE)}`);

await section("Sitemaps", async () => {
  const d = await call(token, "/sitemaps");
  for (const s of d.sitemap || []) {
    console.log(`${s.path} | errors ${s.errors} warnings ${s.warnings} | last submitted ${s.lastSubmitted} | last downloaded ${s.lastDownloaded} | pending ${s.isPending}`);
    for (const c of s.contents || []) console.log(`   ${c.type}: submitted ${c.submitted}, indexed ${c.indexed ?? "n/a"}`);
  }
  if (!(d.sitemap || []).length) console.log("no sitemaps submitted");
});

await section("Totals by day", async () => {
  for (const r of await query(token, { dimensions: ["date"], rowLimit: 100 })) console.log(row(r));
});
await section("Top queries", async () => { for (const r of await query(token, { dimensions: ["query"], rowLimit: 40 })) console.log(row(r)); });
await section("Top pages", async () => { for (const r of await query(token, { dimensions: ["page"], rowLimit: 40 })) console.log(row(r)); });
await section("Tool pages", async () => {
  const rows = await query(token, { dimensions: ["page"], dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "contains", expression: "/tools" }] }] });
  if (!rows.length) console.log("no impressions for /tools pages yet");
  for (const r of rows) console.log(row(r));
});
await section("Queries for tool pages", async () => {
  for (const r of await query(token, { dimensions: ["query", "page"], dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "contains", expression: "/tools" }] }] })) console.log(row(r, 2));
});
await section("Devices", async () => { for (const r of await query(token, { dimensions: ["device"] })) console.log(row(r)); });
await section("Countries", async () => { for (const r of await query(token, { dimensions: ["country"], rowLimit: 8 })) console.log(row(r)); });

// Targeted pairs avoid inferring a page from separate top-query/top-page tables.
console.log("Evidence scope: Web, finalized data, all countries/devices. API rows may be incomplete or anonymized; paired rows must not be summed into property totals. No post-release attribution without matching dates/filters.");
for (const spec of opportunityQueries(RANGE)) {
  await section(spec.name, async () => {
    const { rows, capped } = await collectEvidence((body) => query(token, body), spec.body);
    console.log(JSON.stringify({ section: spec.name, range: RANGE, rows: rows.length,
      rowCapReached: capped, limit: 1000, completeness: "GSC available rows only" }));
    for (const item of rows) console.log(evidenceLine(item));
  });
}
