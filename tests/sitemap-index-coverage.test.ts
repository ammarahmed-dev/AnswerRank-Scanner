import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeUrlset, sitemapEntryLimitIssue } from "@/lib/sitemap-check";

const { safeFetch, pinnedFetch, reserveUsage, commitUsage, releaseUsage, budget } = vi.hoisted(() => ({
  safeFetch: vi.fn(), pinnedFetch: vi.fn(), reserveUsage: vi.fn(), commitUsage: vi.fn(), releaseUsage: vi.fn(), budget: { skipChildren: false },
}));
vi.mock("@/lib/auth-server", () => ({ getAuthContext: vi.fn().mockResolvedValue({ user: null, plan: "free" }) }));
vi.mock("@/lib/usage-limits", () => ({ reserveUsage, commitUsage, releaseUsage, getClientKey: () => "fixture" }));
vi.mock("@/lib/url-safety", () => ({ assertPublicUrl: vi.fn(), safeFetch, pinnedFetch }));
vi.mock("@/lib/batch", async (original) => {
  const actual = await original<typeof import("@/lib/batch")>();
  return { runWithBudget: (...args: Parameters<typeof actual.runWithBudget>) => budget.skipChildren && args[2].budgetMs === 20_000
    ? Promise.resolve({ started: 0, skipped: args[0].length }) : actual.runWithBudget(...args) };
});
const origin = "https://a.test";
const file = (count: number, prefix = "page") => `<urlset>${Array.from({ length: count }, (_, i) => `<url><loc>${origin}/${prefix}${i}</loc></url>`).join("")}</urlset>`;
const index = (count: number) => `<sitemapindex>${Array.from({ length: count }, (_, i) => `<sitemap><loc>${origin}/child${i}.xml</loc></sitemap>`).join("")}</sitemapindex>`;
let root: string;
let child: (id: number) => Response;
beforeEach(() => {
  vi.clearAllMocks(); budget.skipChildren = false;
  root = index(2); child = () => new Response(file(1));
  reserveUsage.mockResolvedValue({ allowed: true, reserved: true });
  pinnedFetch.mockImplementation(async () => new Response(null, { status: 200 }));
  safeFetch.mockImplementation(async (url: string) => {
    const path = new URL(url).pathname;
    const response = path === "/robots.txt" ? new Response(`Sitemap: ${origin}/sitemap.xml`) : path === "/sitemap.xml" ? new Response(root) : child(Number(path.match(/child(\d+)/)?.[1]));
    return { response, finalUrl: url };
  });
});
async function run() {
  const { POST } = await import("@/app/api/tools/sitemap-checker/route");
  const response = await POST(new Request(`${origin}/api/tool`, { method: "POST", body: JSON.stringify({ url: origin }) }));
  expect(response.status).toBe(200);
  return response.json();
}
describe("sitemap index file limits and coverage", () => {
  it("returns a lastmod warning for impossible calendar dates through the real route", async () => {
    root = '<urlset><url><loc>https://a.test/page</loc><lastmod>2026-02-30</lastmod></url></urlset>';
    const result = await run();
    expect(result.urlCount).toBe(1);
    expect(result.withLastmod).toBe(1);
    expect(result.issues).toEqual([{ level: "warning", message: '1 lastmod value is not a valid date (for example "2026-02-30"). Use YYYY-MM-DD.' }]);
    expect(commitUsage).toHaveBeenCalledTimes(1);
  });
  it("does not apply a per-file URL limit to a combined index total", async () => {
    child = id => new Response(file(30_000, `child${id}-`));
    const result = await run();
    expect(result.urlCount).toBe(60_000);
    expect(result.indexCoverage).toEqual({ listed: 2, selected: 2, parsed: 2 });
    expect(result.issues.some((x: { message: string }) => x.message.includes("50,000"))).toBe(false);
    expect(pinnedFetch).toHaveBeenCalledTimes(8);
    expect(commitUsage).toHaveBeenCalledOnce();
  });
  it("still flags the individual child file that exceeds the URL limit", async () => {
    child = id => new Response(file(id === 0 ? 50_001 : 1, `child${id}-`));
    const result = await run();
    expect(result.issues).toContainEqual({ level: "error", message: expect.stringContaining("Child sitemap https://a.test/child0.xml: 50001 URLs exceeds the 50,000 limit per sitemap file") });
    expect(result.indexCoverage.parsed).toBe(2); // Parsed is coverage, not a validation pass.
  });
  it("exposes the five-child cap rather than treating selected totals as the whole index", async () => {
    root = index(6);
    const result = await run();
    expect(result.indexCoverage).toEqual({ listed: 6, selected: 5, parsed: 5 });
    expect(result.urlCount).toBe(5);
    expect(safeFetch.mock.calls.some(([url]) => url.endsWith("child5.xml"))).toBe(false);
  });
  it("does not count a failed child as parsed", async () => {
    child = id => id === 0 ? new Response(file(2)) : new Response(null, { status: 404 });
    const result = await run();
    expect(result.indexCoverage).toEqual({ listed: 2, selected: 2, parsed: 1 });
    expect(result.urlCount).toBe(2);
    expect(result.children[1].error).toBe("HTTP 404");
  });
  it("keeps time-budget exclusions unknown instead of counting them as parsed", async () => {
    budget.skipChildren = true;
    const result = await run();
    expect(result.indexCoverage).toEqual({ listed: 2, selected: 2, parsed: 0 });
    expect(result.children.every((x: { error: string }) => x.error === "Not checked (time budget)")).toBe(true);
  });
  it("does not count nested indexes as parsed URL files", async () => {
    child = () => new Response(index(1));
    const result = await run();
    expect(result.indexCoverage.parsed).toBe(0);
    expect(result.children[0].error).toBe("Nested sitemap index");
  });
  it("enforces the index file's own child-entry limit independently", async () => {
    root = index(50_001);
    const result = await run();
    expect(result.issues).toContainEqual({ level: "error", message: expect.stringContaining("50001 child sitemap entries exceeds the 50,000 limit") });
    expect(result.indexCoverage).toEqual({ listed: 50_001, selected: 5, parsed: 5 });
  });
  it("preserves standalone file limits and omits index-only coverage", async () => {
    root = file(50_001);
    const result = await run();
    expect(result.indexCoverage).toBeUndefined();
    expect(result.issues).toContainEqual({ level: "error", message: expect.stringContaining("50001 URLs exceeds the 50,000 limit") });
  });
  it("keeps non-limit checks in aggregate analysis", () => {
    const entries = [{ loc: "/relative" }, { loc: "https://a.test/x" }, { loc: "https://a.test/x" }];
    const result = analyzeUrlset(entries, origin, new Date(), 10, "index-aggregate");
    expect(result.issues.some(x => x.message.includes("not valid absolute"))).toBe(true);
    expect(result.issues.some(x => x.message.includes("duplicate URL"))).toBe(true);
    expect(sitemapEntryLimitIssue(50_000, "index")).toBeNull();
    expect(sitemapEntryLimitIssue(50_000, "urlset")).toBeNull();
  });
});
