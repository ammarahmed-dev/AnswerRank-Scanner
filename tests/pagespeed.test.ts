import { afterEach, describe, expect, it, vi } from "vitest";
import { getPageSpeedScore } from "@/lib/pagespeed";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("PageSpeed lab measurements", () => {
  it.each([0, 250])("stores measured TBT %s separately from field responsiveness", async tbt => {
    vi.stubEnv("GOOGLE_PAGESPEED_API_KEY", "test");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ lighthouseResult: {
      categories: { performance: { score: .83 } },
      audits: { "total-blocking-time": { numericValue: tbt }, interactive: { numericValue: 4500 } },
    } }))));
    expect(await getPageSpeedScore("https://example.test")).toMatchObject({ score: 83, tbt });
    expect(await getPageSpeedScore("https://example.test")).not.toHaveProperty("fid");
  });

  it("does not substitute time to interactive when TBT is missing", async () => {
    vi.stubEnv("GOOGLE_PAGESPEED_API_KEY", "test");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ lighthouseResult: {
      categories: { performance: { score: .83 } }, audits: { interactive: { numericValue: 4500 } },
    } }))));
    expect(await getPageSpeedScore("https://example.test")).toMatchObject({ score: 83, tbt: null });
  });
});
