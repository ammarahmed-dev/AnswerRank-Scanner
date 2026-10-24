import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScanResult, ScrapedData } from "@/types/index";
const { runScanCore, generateAIInsights, saveReportRecord, commitUsage, releaseUsage } = vi.hoisted(() => ({
  runScanCore: vi.fn(), generateAIInsights: vi.fn(), saveReportRecord: vi.fn(), commitUsage: vi.fn(), releaseUsage: vi.fn(),
}));
vi.mock("@/lib/scan-core", () => ({ runScanCore }));
vi.mock("@/lib/ai-provider", () => ({ generateAIInsights }));
vi.mock("@/lib/report-db", () => ({ saveReportRecord, getPreviousReportSummary: async () => null }));
vi.mock("@/lib/auth-server", () => ({ getAuthContext: async () => ({ user: null, plan: "guest" }) }));
vi.mock("@/lib/url-safety", () => ({ assertPublicUrl: vi.fn() }));
vi.mock("@/lib/supabase-config", () => ({ getSupabaseServerUrl: () => "", getSupabaseServiceHeaders: () => ({}), hasSupabaseConfig: () => false }));
vi.mock("@/lib/usage-limits", () => ({ reserveUsage: async () => ({ allowed: true, reserved: true }), commitUsage, releaseUsage, getPlanLimit: () => 1, getClientKey: () => "test" }));
import { POST } from "@/app/api/scan/route";

const scrapedData: ScrapedData = { url: "https://example.test/", title: "Example", metaDescription: "Example", canonical: "", headings: ["H1: Example"], schemaTypes: [], schemaBlocks: 0, bodyText: "Useful content", images: [], internalLinks: 0, wordCount: 2, ogTitle: "", ogDescription: "", ogImage: "", source: "html" };
const core = { scrapedData, score: 73, checks: [], pagespeed: null, pagespeedResult: null, categoryScores: { metadata: 37 }, metadata: { title: "Example" } };
function request(options: Record<string, unknown> = {}, signal?: AbortSignal) {
  return new Request("https://aeocheck.co/api/scan", { method: "POST", signal, body: JSON.stringify({ url: "https://example.test", includeAI: false, ...options }) });
}
function untilAbort(signal: AbortSignal) {
  return new Promise<never>((_resolve, reject) => {
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  runScanCore.mockReset().mockResolvedValue(core);
  generateAIInsights.mockReset().mockResolvedValue(null);
  saveReportRecord.mockReset().mockImplementation(async (report: ScanResult) => ({ ...report, reportId: "saved" }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("scan lifecycle cancellation", () => {
  it.each(["stream", "request"])("aborts core work on %s cancellation and releases usage exactly once", async kind => {
    let coreSignal: AbortSignal | undefined;
    runScanCore.mockImplementation((_url, options) => { coreSignal = options.signal; return untilAbort(options.signal); });
    const abort = new AbortController();
    const response = await POST(request({}, abort.signal) as never);
    await vi.waitFor(() => expect(coreSignal).toBeDefined());
    if (kind === "stream") await response.body!.cancel(); else abort.abort();
    await vi.waitFor(() => expect(releaseUsage).toHaveBeenCalledTimes(1));
    expect(coreSignal?.aborted).toBe(true);
    expect(saveReportRecord).not.toHaveBeenCalled();
    expect(commitUsage).not.toHaveBeenCalled();
  });

  it("aborts AI work and does not save a cancelled scan", async () => {
    let aiSignal: AbortSignal | undefined;
    generateAIInsights.mockImplementation((_prompt, signal) => { aiSignal = signal; return untilAbort(signal); });
    const response = await POST(request({ includeAI: true }) as never);
    await vi.waitFor(() => expect(aiSignal).toBeDefined());
    await response.body!.cancel();
    await vi.waitFor(() => expect(releaseUsage).toHaveBeenCalledTimes(1));
    expect(aiSignal?.aborted).toBe(true);
    expect(saveReportRecord).not.toHaveBeenCalled();
  });

  it.each(["timeout", "disconnect"])("aborts competitor fetches on %s", async kind => {
    vi.stubEnv("COMPETITOR_SCAN_TIMEOUT_MS", kind === "timeout" ? "10" : "1000");
    let competitorSignal: AbortSignal | undefined;
    runScanCore.mockResolvedValueOnce(core).mockImplementation((_url, options) => {
      competitorSignal = options.signal;
      return untilAbort(options.signal);
    });
    const response = await POST(request({ competitorUrls: ["https://competitor.test"] }) as never);
    await vi.waitFor(() => expect(competitorSignal).toBeDefined());
    if (kind === "disconnect") {
      await response.body!.cancel();
      await vi.waitFor(() => expect(releaseUsage).toHaveBeenCalledTimes(1));
      expect(saveReportRecord).not.toHaveBeenCalled();
    } else {
      const text = await response.text();
      expect(text).toContain('"type":"result"');
      expect(saveReportRecord.mock.calls[0][0].competitors).toEqual([{ url: "https://competitor.test/", error: "Could not scan competitor URL" }]);
      expect(saveReportRecord).toHaveBeenCalledTimes(1);
      expect(commitUsage).toHaveBeenCalledTimes(1);
      expect(releaseUsage).not.toHaveBeenCalled();
    }
    expect(competitorSignal?.aborted).toBe(true);
  });

  it("finishes an already started report save and commits usage after disconnect", async () => {
    let finishSave: ((value: ScanResult) => void) | undefined;
    saveReportRecord.mockImplementation(() => new Promise(resolve => { finishSave = resolve; }));
    const response = await POST(request() as never);
    await vi.waitFor(() => expect(finishSave).toBeDefined());
    await response.body!.cancel();
    finishSave!({ ...core, url: scrapedData.url, reportId: "saved", scannedAt: "2026-10-25" } as unknown as ScanResult);
    await vi.waitFor(() => expect(commitUsage).toHaveBeenCalledTimes(1));
    expect(releaseUsage).not.toHaveBeenCalled();
  });
});
