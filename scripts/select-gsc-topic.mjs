// Read-only GSC query evidence -> select one unpublished topical-map topic.
// This process deliberately emits only the selected slug, never raw query strings,
// account secrets, URLs, or private metrics to public GitHub Actions logs.
import fs from "node:fs";
import { getAccessToken } from "./lib/gsc-auth.mjs";
import { overviewRange } from "./lib/gsc-opportunities.mjs";
import { selectGscTopic, previousWindow } from "./lib/select-gsc-topic.mjs";

const site = process.env.GSC_SITE_URL;
const output = process.env.GITHUB_OUTPUT;
if (!site || !output) throw new Error("GSC_SITE_URL and GITHUB_OUTPUT are required");
const map = JSON.parse(fs.readFileSync("content/topical-map.json", "utf8"));
const currentRange = overviewRange(28);
const prevRange = previousWindow(currentRange);
const token = await getAccessToken({ readOnly: true });

async function query(range) {
  const url = "https://www.googleapis.com/webmasters/v3/sites/" +
    encodeURIComponent(site) + "/searchAnalytics/query";
  const res = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(30_000),
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({
      ...range, type: "web", dataState: "final", dimensions: ["query"], rowLimit: 1500,
    }),
  });
  if (!res.ok) throw new Error("GSC query failed with HTTP " + res.status);
  const data = await res.json();
  return Array.isArray(data.rows) ? data.rows : [];
}

const currentRows = await query(currentRange);
const previousRows = await query(prevRange);
const choice = selectGscTopic({
  map, blogDir: "content/blog", currentRows, previousRows, minImpressions: 5,
});
fs.appendFileSync(output, "slug=" + (choice?.slug || "") + "\n");
if (choice) {
  // Do not publish detailed GSC data to a public workflow log.
  console.log("Eligible draft selected from finalized, first-party GSC evidence: " + choice.slug);
} else {
  console.log("No unpublished topic met the evidence threshold; skip scheduled draft.");
}
