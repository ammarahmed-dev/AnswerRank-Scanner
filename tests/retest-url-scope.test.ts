import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScanResult, ScrapedData } from "@/types/index";
const { saveReportRecord } = vi.hoisted(() => ({ saveReportRecord: vi.fn() }));
vi.mock("@/lib/report-db", () => ({ saveReportRecord, getPreviousReportSummary: async () => null }));
vi.mock("@/lib/auth-server", () => ({ getAuthContext: async () => ({ user: { id: "owner", email: "fixture@example.test" }, plan: "free" }) }));
vi.mock("@/lib/url-safety", () => ({ assertPublicUrl: vi.fn() }));
vi.mock("@/lib/supabase-config", () => ({ getSupabaseServerUrl: () => "https://db.test", getSupabaseServiceHeaders: () => ({}), hasSupabaseConfig: () => true }));
vi.mock("@/lib/usage-limits", () => ({ reserveUsage: async () => ({ allowed: true, reserved: true }), commitUsage: vi.fn(), releaseUsage: vi.fn(), getPlanLimit: () => 3, getClientKey: () => "test" }));
vi.mock("@/lib/scan-core", () => ({ runScanCore: async () => ({
  scrapedData: { url: "https://example.test/path?q=one", title: "Example", metaDescription: "Example", canonical: "", headings: ["H1: Example"], schemaTypes: [], schemaBlocks: 0, bodyText: "Useful content", images: [], internalLinks: 0, wordCount: 2, ogTitle: "", ogDescription: "", ogImage: "", source: "html" } satisfies ScrapedData,
  score: 73, checks: [], pagespeed: null, pagespeedResult: null, categoryScores: {}, metadata: { title: "Example" },
}) }));
import { POST } from "@/app/api/scan/route";

beforeEach(() => {
  saveReportRecord.mockReset().mockImplementation(async (report: ScanResult) => ({ ...report, reportId: "saved" }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("retest unlock URL scope", () => {
  it.each([
    ["same URL", "https://example.test/path?q=one", true],
    ["normalized host and fragment", "https://EXAMPLE.test/path?q=one#section", true],
    ["different host", "https://other.test/path?q=one", false],
    ["different page", "https://example.test/other?q=one", false],
    ["different query", "https://example.test/path?q=two", false],
    ["different scheme", "http://example.test/path?q=one", false],
    ["missing stored URL", undefined, false],
    ["malformed stored URL", "https://[invalid", false],
  ])("handles %s without transferring a report unlock", async (_label, sourceUrl, expected) => {
    const fetchMock = vi.fn(async (input: string) => {
      expect(input).toContain("https://db.test/rest/v1/reports?");
      return new Response(JSON.stringify([{ url: sourceUrl, result: { unlocked: true }, retest_count: 1, max_retests: 3 }]));
    });
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(new Request("https://aeocheck.co/api/scan", {
      method: "POST", body: JSON.stringify({ url: "https://example.test/path?q=one", retestOfReportId: "source-report", includeAI: false }),
    }) as never);
    expect(response.status).toBe(200);
    const events = (await response.text()).split("\n").filter(line => line.startsWith("data: ")).map(line => JSON.parse(line.slice(6)));
    const report = events.find(event => event.type === "result")?.result;
    expect(report.unlocked).toBe(expected);
    expect(report.isFullReport).toBe(expected);
    expect(Boolean(report.redacted)).toBe(!expected);
    expect(saveReportRecord.mock.calls[0][0].unlocked).toBe(expected);
    const params = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
    expect(params.get("user_id")).toBe("eq.owner");
    expect(params.get("id")).toBe("eq.source-report");
    expect(params.get("select")?.split(",")).toContain("url");
  });
});
