import { afterEach, describe, expect, it, vi } from "vitest";
import type { ScanResult } from "@/types/index";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.resetModules(); });

describe("configured report persistence", () => {
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
