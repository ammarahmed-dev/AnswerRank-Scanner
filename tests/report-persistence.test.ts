import { afterEach, describe, expect, it, vi } from "vitest";
import { createScoringMethodology } from "@/lib/scoring-policy";
import { getResolvedReportCategoryScores } from "@/lib/report-category-scores";
import type { ScanResult } from "@/types/index";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.resetModules(); });

describe("configured report persistence", () => {
  it("preserves scoring methodology and original category values through save, read and public preview", async () => {
    vi.stubEnv("SUPABASE_URL", "https://db.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
    let stored: { result: ScanResult } | undefined;
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        stored = JSON.parse(String(init.body));
        return new Response(null, { status: 201 });
      }
      return new Response(JSON.stringify([{ result: stored?.result, user_id: "owner", retest_count: 0, max_retests: 3 }]));
    });
    const { saveReportRecord, getReportRecord, getPreviousReportSummary } = await import("@/lib/report-db");
    const methodology = createScoringMethodology({ pageSource: "html", requestedUrl: "https://example.test", resolvedUrl: "https://example.test/final", finalUrlVerified: true, pageSpeed: "unavailable" });
    const original: ScanResult = { url: "https://example.test", score: 73, checks: [{ id: "title", label: "Title", status: "pass", weight: 1, detail: "Title found" }], categoryScores: { metadata: 37 }, methodology, pagespeed: null, aiInsights: null, scannedAt: "2026-10-24T00:00:00Z" };
    const saved = await saveReportRecord(original, "owner");
    const loaded = await getReportRecord(saved.reportId!);
    expect(loaded?.methodology).toEqual(methodology);
    expect((await getPreviousReportSummary("owner", original.url))?.methodologyVersion).toBe(methodology.version);
    const { GET } = await import("@/app/api/reports/[id]/route");
    const response = await GET(new Request("https://aeocheck.co/api/reports/id"), { params: Promise.resolve({ id: saved.reportId! }) });
    const preview = await response.json() as ScanResult;
    expect(preview.methodology).toEqual(methodology);
    expect(preview.score).toBe(73);
    expect(getResolvedReportCategoryScores(preview)).toEqual([{ category: "metadata", label: "Metadata", score: 37 }]);
  });

  it("fails instead of saving locally or dropping ownership on database rejection", async () => {
    vi.stubEnv("SUPABASE_URL", "https://db.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
    const fetchMock = vi.fn(async () => new Response("user_id column missing", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { saveReportRecord } = await import("@/lib/report-db");
    await expect(saveReportRecord({ url: "https://example.com", score: 80 } as ScanResult, "owner")).rejects.toThrow("Report storage is temporarily unavailable");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
