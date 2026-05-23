#!/usr/bin/env node

const TARGET_URL = "https://www.aeocheck.co/";
const SCAN_ENDPOINT = "http://127.0.0.1:3000/api/scan";
const HOME_ENDPOINT = "http://127.0.0.1:3000";
const BLOCKED_TYPES = new Set(["article", "blogposting", "newsarticle"]);

function fail(message, extra) {
  console.error(`FAIL: ${message}`);
  if (extra) console.error(extra);
  process.exit(1);
}

function pass(message) {
  console.log(`PASS: ${message}`);
}

function keysOf(value) {
  if (!value || typeof value !== "object") return [];
  return Object.keys(value);
}

function safePreview(value, max = 1200) {
  try {
    const json = JSON.stringify(value, null, 2);
    if (!json) return String(value);
    return json.slice(0, max);
  } catch {
    return String(value).slice(0, max);
  }
}

function collectSchemaSignals(result) {
  const signals = [];
  const schemaRec = result?.aiInsights?.schemaRecommendations;
  if (!schemaRec) return signals;

  if (Array.isArray(schemaRec.missing)) {
    signals.push(...schemaRec.missing.map((v) => String(v)));
  }
  if (typeof schemaRec.priority === "string" && schemaRec.priority.trim()) {
    signals.push(schemaRec.priority);
  }
  return signals;
}

function parseSseEvents(raw) {
  const chunks = raw.split(/\r?\n\r?\n/);
  const events = [];
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const lines = chunk.split(/\r?\n/);
    let eventType = "message";
    const dataLines = [];
    for (const line of lines) {
      if (line.startsWith("event:")) eventType = line.slice(6).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (!dataLines.length) continue;
    const dataRaw = dataLines.join("\n");
    let parsed = null;
    try {
      parsed = JSON.parse(dataRaw);
    } catch {
      parsed = dataRaw;
    }
    events.push({ eventType, data: parsed });
  }
  return events;
}

async function main() {
  let home;
  try {
    home = await fetch(HOME_ENDPOINT);
  } catch (err) {
    fail("Local dev server is not reachable on http://127.0.0.1:3000", String(err));
  }

  if (!home.ok) {
    fail(`Local dev server returned ${home.status} for ${HOME_ENDPOINT}`);
  }

  const response = await fetch(SCAN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: TARGET_URL, includeAI: false }),
  });

  if (response.status === 429) {
    fail(
      "Scan request returned 429 Too Many Requests.",
      "Tip: restart dev server with AEO_DEV_BYPASS_SCAN_LIMIT=true for local verification."
    );
  }

  if (!response.ok) {
    fail(`Scan request failed with HTTP ${response.status}`, await response.text());
  }

  const raw = await response.text();
  const events = parseSseEvents(raw);
  const eventTypes = events.map((evt) => evt.eventType);
  console.log(`INFO: SSE event types found: ${eventTypes.join(", ") || "(none)"}`);
  const errorEvent = events.find((evt) => evt.eventType === "error" || evt.data?.type === "error");
  if (errorEvent) {
    fail("Scan stream returned an error event.", JSON.stringify(errorEvent.data));
  }

  const resultEvent = events.find((evt) => evt.eventType === "result" || evt.data?.type === "result");
  if (!resultEvent) {
    fail("No result event found in scan SSE response.", raw.slice(0, 1500));
  }

  const parsed = resultEvent.data;
  const parsedKeys = keysOf(parsed);
  const hasNestedResult = Boolean(parsed && typeof parsed === "object" && parsed.result && typeof parsed.result === "object");
  const result = hasNestedResult ? parsed.result : parsed;
  const resultKeys = keysOf(result);
  const nestedCategoryScores = parsed?.result?.categoryScores;
  const directCategoryScores = parsed?.categoryScores;
  const categoryScores = nestedCategoryScores ?? directCategoryScores;

  console.log(`INFO: result event keys: ${parsedKeys.join(", ") || "(none)"}`);
  console.log(`INFO: parsed.result exists: ${hasNestedResult ? "yes" : "no"}`);
  if (hasNestedResult) {
    console.log(`INFO: parsed.result keys: ${resultKeys.join(", ") || "(none)"}`);
  } else {
    console.log(`INFO: parsed object keys: ${parsedKeys.join(", ") || "(none)"}`);
    console.log(`INFO: parsed preview: ${safePreview(parsed, 1200)}`);
  }

  if (!categoryScores || typeof categoryScores !== "object") {
    fail(
      "categoryScores is missing in both parsed.result.categoryScores and parsed.categoryScores.",
      safePreview(parsed, 1500)
    );
  }

  const detectedShape = nestedCategoryScores ? "parsed.result.categoryScores" : "parsed.categoryScores";
  pass(`categoryScores exists at ${detectedShape}.`);

  const schemaSignals = collectSchemaSignals(result).map((v) => v.toLowerCase().trim());
  const blockedFound = schemaSignals.filter((v) => BLOCKED_TYPES.has(v));

  if (blockedFound.length > 0) {
    fail(
      "Homepage result included blocked article-like schema recommendation types.",
      `Found: ${Array.from(new Set(blockedFound)).join(", ")}`
    );
  }
  pass("Homepage result does not include Article, BlogPosting, or NewsArticle recommendations.");

  console.log("PASS: verify:scan completed.");
}

main().catch((err) => {
  fail("Unexpected runtime failure in verify script.", err instanceof Error ? err.stack || err.message : String(err));
});
