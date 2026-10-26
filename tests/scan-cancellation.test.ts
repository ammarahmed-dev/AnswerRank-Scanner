import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScanResult, ScrapedData, AIRecommendationProvenance } from "@/types/index";
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


describe("invalid AI output does not invalidate a deterministic scan", () => {
  it("retains valid insights while grounding schema in the scraper", async () => {
    runScanCore.mockResolvedValue({ ...core, scrapedData: { ...scrapedData, schemaTypes: ["Organization"] } });
    generateAIInsights.mockResolvedValue(JSON.stringify({ recommendations: ["Clarify product facts."], quickWin: "Review headings.", contentGap: "Clarify the offer.", summary: "Review missing signals.", schemaRecommendations: { detected: ["Invented"], missing: ["Organization", "Article", "Product"], priority: "Organization", reasoning: "Review applicable types." } }));
    const req = new Request("https://aeocheck.co/api/scan", { method: "POST", body: JSON.stringify({ url: "https://valid-ai-output.test", includeAI: true }) });
    const response = await POST(req as never);
    await response.text();
    expect(saveReportRecord.mock.calls[0][0].aiInsights.schemaRecommendations).toEqual({ detected: ["Organization"], missing: ["Product"], priority: "Product", reasoning: "Review applicable types." });
    expect(saveReportRecord.mock.calls[0][0].score).toBe(core.score);
  });
  it("saves the unchanged score without provider error text or invented insights", async () => {
    generateAIInsights.mockResolvedValue("provider-error-secret: not JSON");
    const req = new Request("https://aeocheck.co/api/scan", { method: "POST", body: JSON.stringify({ url: "https://invalid-ai-output.test", includeAI: true }) });
    const response = await POST(req as never);
    const output = await response.text();
    expect(generateAIInsights).toHaveBeenCalledTimes(1);
    expect(output).not.toContain("provider-error-secret");
    expect(output).toContain('"label":"Using local recommendations","status":"skipped"');
    expect(saveReportRecord).toHaveBeenCalledTimes(1);
    expect(saveReportRecord.mock.calls[0][0].score).toBe(core.score);
    expect(saveReportRecord.mock.calls[0][0].aiInsights).toBeNull();
    expect(commitUsage).toHaveBeenCalledTimes(1);
  });
});


describe("oversized encoded AI input", () => {
  it("skips the provider and still saves deterministic results", async () => {
    vi.stubEnv("AI_MAX_INPUT_CHARS", "8000");
    runScanCore.mockResolvedValue({ ...core, scrapedData: { ...scrapedData, bodyText: "\u0000".repeat(8000) } });
    const req = new Request("https://aeocheck.co/api/scan", { method: "POST", body: JSON.stringify({ url: "https://oversized-ai-input.test", includeAI: true }) });
    const response = await POST(req as never);
    await response.text();
    expect(generateAIInsights).not.toHaveBeenCalled();
    expect(saveReportRecord).toHaveBeenCalledTimes(1);
    expect(saveReportRecord.mock.calls[0][0].score).toBe(core.score);
    expect(saveReportRecord.mock.calls[0][0].aiInsights).toBeNull();
    expect(commitUsage).toHaveBeenCalledTimes(1);
  });
});


describe("repeat scan AI reuse", () => {
  it("saves validated insights on both scans without a second provider call", async () => {
    generateAIInsights.mockResolvedValue(JSON.stringify({ recommendations: ["Clarify product facts."], quickWin: "Review headings.", contentGap: "Clarify the offer.", summary: "Review missing signals." }));
    for (let i = 0; i < 2; i++) {
      const req = new Request("https://aeocheck.co/api/scan", { method: "POST", body: JSON.stringify({ url: "https://cache-reuse.test", includeAI: true }) });
      await (await POST(req as never)).text();
    }
    expect(generateAIInsights).toHaveBeenCalledTimes(1);
    expect(saveReportRecord).toHaveBeenCalledTimes(2);
    expect(saveReportRecord.mock.calls[1][0].aiInsights).toEqual(saveReportRecord.mock.calls[0][0].aiInsights);
    expect(saveReportRecord.mock.calls[1][0].score).toBe(core.score);
    expect(commitUsage).toHaveBeenCalledTimes(2);
  });
});

describe("validated recommendation provenance persistence", () => {
  it("saves server metadata and preserves original generation time on reuse", async () => {
    const provenance: AIRecommendationProvenance = { kind: "provider_generated", provider: "OpenRouter", requestedModel: "openrouter/free", responseModel: "fixture/model", generatedAt: "2026-10-26T10:00:00.000Z" };
    generateAIInsights.mockImplementation(async (_prompt: string, _signal: AbortSignal, receipt: (p: AIRecommendationProvenance) => void) => {
      receipt(provenance);
      return JSON.stringify({ recommendations: ["Review heading."], quickWin: "Clarify heading.", contentGap: "Clarify offer.", summary: "Review signals.", provenance: { provider: "forged", generatedAt: "future" } });
    });
    for (let i = 0; i < 2; i++) await (await POST(request({ url: "https://provenance-reuse.test", includeAI: true }) as never)).text();
    expect(generateAIInsights).toHaveBeenCalledTimes(1);
    expect(saveReportRecord).toHaveBeenCalledTimes(2);
    for (const [report] of saveReportRecord.mock.calls) {
      expect(report.aiInsights.provenance).toEqual(provenance);
      expect(report.score).toBe(core.score);
    }
    expect(commitUsage).toHaveBeenCalledTimes(2);
  });
  it("does not save provenance for invalid generated output", async () => {
    generateAIInsights.mockImplementation(async (_prompt: string, _signal: AbortSignal, receipt: (p: AIRecommendationProvenance) => void) => {
      receipt({ kind: "provider_generated", provider: "DeepSeek", generatedAt: "2026-10-26T10:00:00.000Z" });
      return "invalid output";
    });
    await (await POST(request({ url: "https://invalid-provenance.test", includeAI: true }) as never)).text();
    expect(saveReportRecord.mock.calls[0][0].aiInsights).toBeNull();
  });
});
