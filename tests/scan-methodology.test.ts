import { describe, expect, it, vi } from "vitest";
import type { ScanResult, ScrapedData } from "@/types/index";
import { createScoringMethodology } from "@/lib/scoring-policy";
const { runScanCore, saveReportRecord } = vi.hoisted(() => ({ runScanCore: vi.fn(), saveReportRecord: vi.fn(async (report: ScanResult) => ({ ...report, reportId: "saved-report" })) }));
vi.mock("@/lib/scan-core", () => ({ runScanCore }));
vi.mock("@/lib/report-db", () => ({ saveReportRecord, getPreviousReportSummary: async () => null }));
vi.mock("@/lib/auth-server", () => ({ getAuthContext: async () => ({ user: null, plan: "guest" }) }));
vi.mock("@/lib/url-safety", () => ({ assertPublicUrl: vi.fn() }));
vi.mock("@/lib/supabase-config", () => ({ getSupabaseServerUrl: () => "", getSupabaseServiceHeaders: () => ({}), hasSupabaseConfig: () => false }));
vi.mock("@/lib/usage-limits", () => ({ reserveUsage: async () => ({ allowed: true, reserved: true }), commitUsage: vi.fn(), releaseUsage: vi.fn(), getPlanLimit: () => 1, getClientKey: () => "test" }));
import { POST } from "@/app/api/scan/route";

describe("streamed scan methodology", () => {
  it("stores and returns the original methodology and category snapshot to preview viewers", async () => {
    const scrapedData: ScrapedData = { url: "https://example.test/final", title: "Example", metaDescription: "An example page", canonical: "", headings: ["H1: Example"], schemaTypes: [], schemaBlocks: 0, bodyText: "Some useful page content", images: [], internalLinks: 0, wordCount: 4, ogTitle: "", ogDescription: "", ogImage: "", source: "html" };
    const methodology = createScoringMethodology({ pageSource: "html", requestedUrl: "https://example.test/", resolvedUrl: scrapedData.url, finalUrlVerified: true, pageSpeed: "unavailable", resources: {
      robots: {state:"blocked",httpStatus:403}, sitemap: {state:"unreachable",reason:"timeout"}, llms: {state:"not_found",httpStatus:404},
    } });
    const checks: ScanResult["checks"] = [{id:"llms_txt",label:"llms.txt",status:"warn",detail:"llms.txt not found (HTTP 404)",weight:2,diagnostic:{state:"not_found",httpStatus:404}}];
    runScanCore.mockResolvedValue({ scrapedData, score: 73, checks, pagespeed: null, pagespeedResult: null, categoryScores: { metadata: 37 }, metadata: { title: "Example" }, methodology });
    const req = new Request("https://aeocheck.co/api/scan", { method: "POST", body: JSON.stringify({ url: "https://example.test", includeAI: false }) });
    const response = await POST(req as never);
    expect(response.status).toBe(200);
    const events = (await response.text()).split("\n").filter(line => line.startsWith("data: ")).map(line => JSON.parse(line.slice(6)));
    const report = events.find(event => event.type === "result")?.result as ScanResult;
    expect(report).toMatchObject({ reportId: "saved-report", score: 73, redacted: true, categoryScores: { metadata: 37 }, methodology });
    expect(saveReportRecord.mock.calls[0][0].methodology).toEqual(methodology);
    expect(saveReportRecord.mock.calls[0][0].checks[0].diagnostic).toEqual(checks[0].diagnostic);
    expect(report.checks[0].diagnostic).toEqual(checks[0].diagnostic);
  });
});
