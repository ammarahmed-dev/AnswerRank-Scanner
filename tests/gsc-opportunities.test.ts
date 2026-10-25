import { afterEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { overviewRange, opportunityQueries, collectEvidence, evidenceLine,
  LONG_QUERY_PATTERN, PRIORITY_PAGE_PATTERN, BRAND_PATTERN } from "../scripts/lib/gsc-opportunities.mjs";
import { getAccessToken } from "../scripts/lib/gsc-auth.mjs";

const range = { startDate: "2026-09-26", endDate: "2026-10-23" };
const row = (query = "how to measure saas visibility", impressions = 10) => ({
  keys: [query, "https://www.aeocheck.co/blog/aeo-for-saas"],
  clicks: 0, impressions, ctr: 0, position: 17.98765,
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("GSC opportunity evidence", () => {
  it("uses Pacific calendar dates at a UTC date boundary", () => {
    expect(overviewRange(28, new Date("2026-10-25T01:00:00Z"))).toEqual({
      startDate: "2026-09-25", endDate: "2026-10-22",
    });
    expect(overviewRange(28, new Date("2026-10-25T12:00:00Z"))).toEqual(range);
  });
  it("handles leap days and DST using calendar days", () => {
    expect(overviewRange(2, new Date("2024-03-02T16:00:00Z"))).toEqual({
      startDate: "2024-02-28", endDate: "2024-02-29",
    });
    expect(overviewRange(1, new Date("2026-11-02T16:00:00Z"))).toEqual({
      startDate: "2026-10-31", endDate: "2026-10-31",
    });
  });
  it.each([0, -1, 366, 1.5, "oops", Infinity])("rejects invalid window %s", (days) => {
    expect(() => overviewRange(days)).toThrow("DAYS");
  });
  it("requests actual pairs under one fixed finalized Web window", () => {
    const specs = opportunityQueries(range);
    expect(specs).toHaveLength(3);
    for (const spec of specs) expect(spec.body).toMatchObject({
      ...range, dimensions: ["query", "page"], type: "web", dataState: "final",
      aggregationType: "auto", dimensionFilterGroups: [{ groupType: "and" }],
    });
    const filters = specs[2].body.dimensionFilterGroups[0].filters;
    expect(filters).toContainEqual({ dimension: "query", operator: "excludingRegex", expression: BRAND_PATTERN });
    expect(specs[0].body.dimensionFilterGroups[0].filters[0].dimension).toBe("query");
  });
  it("matches long queries across whitespace without requiring ASCII words", () => {
    const pattern = new RegExp(LONG_QUERY_PATTERN);
    expect(pattern.test(" how to\nmeasure saas visibility ")).toBe(true);
    expect(pattern.test("best aeo checker")).toBe(false);
    expect(pattern.test("cómo medir visibilidad de marca")).toBe(true);
  });
  it("restricts priority paths to the intended property and exact pages", () => {
    const pattern = new RegExp(PRIORITY_PAGE_PATTERN);
    expect(pattern.test(row().keys[1])).toBe(true);
    expect(pattern.test("https://aeocheck.co/blog/aeo-for-saas/")).toBe(true);
    expect(pattern.test("https://evil.example/blog/aeo-for-saas")).toBe(false);
    expect(pattern.test(row().keys[1] + "-copy")).toBe(false);
    expect(pattern.test(row().keys[1] + "?draft=1")).toBe(false);
  });
  it("paginates the same filters and reports a bounded full-page cap", async () => {
    const query = vi.fn().mockResolvedValueOnce([row("b", 1), row("a", 30)])
      .mockResolvedValueOnce([row("c", 20), row("d", 2)]);
    const body = opportunityQueries(range)[0].body;
    const result = await collectEvidence(query, body, { pageSize: 2, maxPages: 2 });
    expect(result.capped).toBe(true);
    expect(result.rows.map((r: ReturnType<typeof row>) => r.keys[0])).toEqual(["a", "c", "d", "b"]);
    expect(query.mock.calls.map(([b]) => b.startRow)).toEqual([0, 2]);
    expect(query.mock.calls[1][0]).toMatchObject({ ...body, rowLimit: 2 });
  });
  it("stops at a short or empty page and does not interpret no rows as completeness", async () => {
    const query = vi.fn().mockResolvedValue([]);
    expect(await collectEvidence(query, {})).toEqual({ rows: [], capped: false });
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("propagates API failures instead of returning partial successful evidence", async () => {
    const query = vi.fn().mockResolvedValueOnce([row()]).mockRejectedValueOnce(new Error("HTTP 403"));
    await expect(collectEvidence(query, {}, { pageSize: 1 })).rejects.toThrow("HTTP 403");
    await expect(collectEvidence(async () => null, {})).rejects.toThrow("Invalid evidence response");
    await expect(collectEvidence(query, {}, { maxPages: 0 })).rejects.toThrow("bounds");
  });
  it("preserves full query/page labels and precision on one escaped JSON line", () => {
    const item = row("how to " + "measure ".repeat(30) + "\n::warning::hello");
    const line = evidenceLine(item);
    expect(line.split("\n")).toHaveLength(1);
    expect(JSON.parse(line)).toMatchObject({ query: item.keys[0], page: item.keys[1], position: 17.98765 });
    expect(() => evidenceLine({ ...item, position: NaN })).toThrow("Invalid");
  });
});

describe("GSC overview integration", () => {
  const privateKey = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey
    .export({ type: "pkcs8", format: "pem" }).toString();
  it("uses readonly scope only for the overview, preserving sitemap write scope by default", async () => {
    vi.stubEnv("GSC_CLIENT_EMAIL", "fixture@example.invalid");
    vi.stubEnv("GSC_PRIVATE_KEY", privateKey.replace(/\n/g, "\\n"));
    const scopes: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
      const jwt = new URLSearchParams(init.body).get("assertion")!;
      scopes.push(JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()).scope);
      return Response.json({ access_token: "fixture-token" });
    }));
    await getAccessToken({ readOnly: true });
    await getAccessToken();
    expect(scopes).toEqual(["https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/webmasters"]);
  });
  const harness = (fail: boolean) => `
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('oauth2.googleapis.com')) return Response.json({ access_token: 'fixture' });
      if (String(url).endsWith('/sitemaps')) return Response.json({ sitemap: [] });
      const body = JSON.parse(init.body);
      if (body.dimensions?.join(',') === 'query,page' && body.dataState === 'final') {
        if (${fail} && body.dimensionFilterGroups?.[0]?.filters?.[0]?.dimension === 'page')
          return new Response('do not echo response text', { status: 403 });
        return Response.json({ rows: [${JSON.stringify(row("a very long test query"))}] });
      }
      return Response.json({ rows: [] });
    };
    await import('./scripts/gsc-overview.mjs');`;
  const env = () => ({ ...process.env, GSC_CLIENT_EMAIL: "fixture@example.invalid",
    GSC_PRIVATE_KEY: privateKey, GSC_SITE_URL: "sc-domain:example.invalid", DAYS: "28" });
  it("runs all targeted sections without real credentials or external requests", () => {
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", harness(false)], { env: env() }).toString();
    expect(output).toContain('"query":"a very long test query"');
    expect(output).toContain('"rowCapReached":false');
    expect(output).toContain("Best-checker query/page evidence");
    expect(output).toContain("Nonbrand long-query/page evidence");
  });
  it("fails the process on a section error while continuing independent sections", () => {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", harness(true)], { env: env(), encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("failed: GSC /searchAnalytics/query failed (403)");
    expect(result.stdout).not.toContain("do not echo response text");
    expect(result.stdout).toContain("Nonbrand long-query/page evidence");
  });
});
