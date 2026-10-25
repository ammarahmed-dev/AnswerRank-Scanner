// Search Console query/page evidence. No writes, report commits or notifications.
// API contract: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
export const LONG_QUERY_PATTERN = String.raw`^\s*\S+(\s+\S+){3,}\s*$`;
export const BRAND_PATTERN = String.raw`(?i)\baeocheck\b`;
export const PRIORITY_PAGE_PATTERN = String.raw`^https://(www\.)?aeocheck\.co/blog/(best-aeo-tools-ai-search-visibility|aeo-for-saas|how-to-check-if-website-appears-in-chatgpt-recommendations)/?$`;

/** @param {number|string} value @param {Date} now */
export function overviewRange(value = 28, now = new Date()) {
  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new Error("DAYS must be an integer between 1 and 365");
  }
  // GSC dates use Pacific Time. Subtract calendar days without DST arithmetic.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (name) => parts.find((p) => p.type === name).value;
  const end = new Date(`${part("year")}-${part("month")}-${part("day")}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() - 2);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export function opportunityQueries(range) {
  const make = (filters) => ({
    ...range, type: "web", dataState: "final", aggregationType: "auto",
    dimensions: ["query", "page"],
    dimensionFilterGroups: [{ groupType: "and", filters }],
  });
  const include = (dimension, expression) => ({ dimension, operator: "includingRegex", expression });
  return [
    { name: "Best-checker query/page evidence", body: make([
      include("query", "(?i)best.*(aeo|answer engine optimi[sz]ation)"),
    ]) },
    { name: "Priority-guide query/page evidence", body: make([
      include("page", PRIORITY_PAGE_PATTERN),
    ]) },
    { name: "Nonbrand long-query/page evidence (4+ words)", body: make([
      include("query", LONG_QUERY_PATTERN),
      { dimension: "query", operator: "excludingRegex", expression: BRAND_PATTERN },
    ]) },
  ];
}

export async function collectEvidence(query, body, { pageSize = 500, maxPages = 2 } = {}) {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 25000 ||
      !Number.isInteger(maxPages) || maxPages < 1 || maxPages > 10) {
    throw new Error("Invalid evidence pagination bounds");
  }
  const rows = [];
  let capped = false;
  for (let page = 0; page < maxPages; page++) {
    const batch = await query({ ...body, rowLimit: pageSize, startRow: page * pageSize });
    if (!Array.isArray(batch)) throw new Error("Invalid evidence response");
    rows.push(...batch);
    if (batch.length < pageSize) break;
    if (page === maxPages - 1) capped = true;
  }
  // Stable presentation only. GSC chooses the available rows; this cannot recover
  // anonymized queries, guarantee completeness or turn averages into fixed ranks.
  rows.sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks ||
    JSON.stringify(a.keys).localeCompare(JSON.stringify(b.keys)));
  return { rows, capped };
}

export function evidenceLine(row) {
  if (!Array.isArray(row.keys) || row.keys.length !== 2 ||
      row.keys.some((key) => typeof key !== "string") ||
      [row.clicks, row.impressions, row.ctr, row.position].some((n) => !Number.isFinite(n))) {
    throw new Error("Invalid query/page evidence row");
  }
  // JSON keeps full labels/precision and escapes query newlines/log directives.
  return JSON.stringify({ query: row.keys[0], page: row.keys[1], clicks: row.clicks,
    impressions: row.impressions, ctr: row.ctr, position: row.position });
}
