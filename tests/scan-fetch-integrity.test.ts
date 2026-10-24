import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { safeFetch, getPageSpeedScore } = vi.hoisted(() => ({ safeFetch: vi.fn(), getPageSpeedScore: vi.fn(async (_url: string, _signal?: AbortSignal) => ({ score: null })) }));
vi.mock("@/lib/url-safety", () => ({ assertPublicUrl: vi.fn(), safeFetch }));
vi.mock("@/lib/pagespeed", () => ({ getPageSpeedScore }));
import { runScanCore } from "@/lib/scan-core";

afterEach(() => vi.unstubAllGlobals());

const html = "<html><head><title>A page</title></head><body><h1>A page</h1><p>Public page content.</p></body></html>";
let robotsStatus = 200;
let robotsBody = "User-agent: *\nAllow: /";
let robotsRedirect = false;
let llmsBody = "# Example\n> Helpful site guidance";

beforeEach(() => {
  vi.clearAllMocks();
  robotsStatus = 200;
  robotsBody = "User-agent: *\nAllow: /";
  robotsRedirect = false;
  llmsBody = "# Example\n> Helpful site guidance";
  safeFetch.mockImplementation(async (url: string) => {
    if (url === "http://old.test:8080/start") return { response: new Response(html, { headers: { "content-type": "text/html" } }), finalUrl: "https://www.final.test:8443/private/page?x=1" };
    if (url.endsWith("/robots.txt")) return { response: new Response(robotsBody, { status: robotsStatus, headers: { "content-type": "text/plain" } }), finalUrl: robotsRedirect ? "https://policy.test/rules.txt" : url };
    if (url.endsWith("/sitemap.xml")) return { response: new Response("<urlset></urlset>"), finalUrl: url };
    if (url.endsWith("/llms.txt")) return { response: new Response(llmsBody), finalUrl: url };
    throw new Error(`Unexpected fetch ${url}`);
  });
});

describe("scan fetch integrity", () => {
  it("uses the resolved page origin, scheme, port and path for auxiliary checks", async () => {
    robotsBody = "User-agent: OAI-SearchBot\nDisallow: /private/";
    const result = await runScanCore("http://old.test:8080/start");
    expect(result.scrapedData.url).toBe("https://www.final.test:8443/private/page?x=1");
    expect(result.methodology).toMatchObject({
      version: "aeocheck-2026-10-24-v1",
      overall: { aggregation: "weighted", statusCredit: { pass: 1, warn: 0.5, fail: 0 } },
      evidence: { requestedUrl: "http://old.test:8080/start", resolvedUrl: "https://www.final.test:8443/private/page?x=1", finalUrlVerified: true, pageSpeed: "unavailable" },
    });
    expect(result.checks.find(c => c.id === "ai_bot_access")?.status).toBe("fail");
    expect(safeFetch.mock.calls.map(c => c[0])).toEqual([
      "http://old.test:8080/start", "https://www.final.test:8443/robots.txt", "https://www.final.test:8443/sitemap.xml", "https://www.final.test:8443/llms.txt",
    ]);
    expect(getPageSpeedScore.mock.calls[0][0]).toBe("https://www.final.test:8443/private/page?x=1");
  });

  it("keeps llms.txt on the page origin when robots.txt redirects elsewhere", async () => {
    robotsRedirect = true;
    await runScanCore("http://old.test:8080/start", { includePageSpeed: false });
    expect(safeFetch.mock.calls.map(c => c[0])).toContain("https://www.final.test:8443/llms.txt");
    expect(safeFetch.mock.calls.map(c => c[0])).not.toContain("https://policy.test/llms.txt");
  });

  it("rejects an HTML soft 404 as llms.txt even when served as plain text", async () => {
    llmsBody = html;
    const result = await runScanCore("http://old.test:8080/start", { includePageSpeed: false });
    expect(result.checks.find(c => c.id === "llms_txt")?.status).toBe("warn");
    expect(result.scrapedData.hasLlmsTxt).toBe(false);
  });

  it("reports inaccessible robots as unverified rather than found", async () => {
    robotsStatus = 503;
    const result = await runScanCore("http://old.test:8080/start", { includePageSpeed: false });
    expect(result.scrapedData.hasRobotsTxt).toBe(false);
    expect(result.checks.find(c => c.id === "ai_bot_access")?.detail).toContain("could not be verified");
  });

  it("does not claim that the reader fallback verified a redirect destination", async () => {
    safeFetch.mockRejectedValueOnce(new Error("Target blocked HTML access"));
    vi.stubGlobal("fetch", async () => new Response("Title: Reader page\nMarkdown Content:\n# Reader page\n" + "Useful page text for customers. ".repeat(20)));
    const result = await runScanCore("http://old.test:8080/start", { includePageSpeed: false });
    expect(result.methodology.evidence).toMatchObject({ pageSource: "reader", finalUrlVerified: false, pageSpeed: "not_requested" });
    expect(result.methodology.evidence.resolvedUrl).toBeUndefined();
  });

  it("does not start any fetch for an already cancelled scan", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(runScanCore("https://a.test", { signal: controller.signal })).rejects.toThrow();
    expect(safeFetch).not.toHaveBeenCalled();
  });
});
