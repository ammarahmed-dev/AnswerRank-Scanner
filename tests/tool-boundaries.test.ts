import { afterEach, describe, expect, it, vi } from "vitest";
const { reserveUsage, safeFetch } = vi.hoisted(() => ({ reserveUsage: vi.fn(), safeFetch: vi.fn() }));
vi.mock("@/lib/auth-server", () => ({ getAuthContext: async () => ({ user: null, plan: "guest" }) }));
vi.mock("@/lib/usage-limits", () => ({ reserveUsage, commitUsage: vi.fn(), releaseUsage: vi.fn(), getClientKey: () => "test" }));
vi.mock("@/lib/url-safety", () => ({ assertPublicUrl: vi.fn(), safeFetch, pinnedFetch: vi.fn() }));

const routes = [
  ["crawlers", () => import("@/app/api/tools/ai-crawler-check/route")],
  ["robots", () => import("@/app/api/tools/robots-tester/route")],
  ["sitemap", () => import("@/app/api/tools/sitemap-checker/route")],
  ["schema", () => import("@/app/api/tools/schema-checker/route")],
  ["meta", () => import("@/app/api/tools/meta-tag-checker/route")],
  ["content", () => import("@/app/api/tools/content-extractability/route")],
  ["llms", () => import("@/app/api/tools/llms-txt/route")],
] as const;
afterEach(() => vi.clearAllMocks());

describe("tool request boundaries", () => {
  it.each(routes)("%s rejects null and array JSON before usage or fetching", async (_name, load) => {
    const { POST } = await load();
    for (const body of [null, [], "url"]) {
      const req = new Request("https://example.test/api/tool", { method: "POST", body: JSON.stringify(body) });
      expect((await POST(req)).status).toBe(400);
    }
    expect(reserveUsage).not.toHaveBeenCalled();
    expect(safeFetch).not.toHaveBeenCalled();
  });

  it.each(routes)("%s rejects oversized unadvertised request bodies", async (_name, load) => {
    const { POST } = await load();
    const req = new Request("https://example.test/api/tool", { method: "POST", body: JSON.stringify({ url: "https://example.test", padding: "x".repeat(40_000) }) });
    expect((await POST(req)).status).toBe(413);
    expect(reserveUsage).not.toHaveBeenCalled();
  });

  it("cancels an oversized robots stream and returns its usage reservation", async () => {
    reserveUsage.mockResolvedValue({ allowed: true, reserved: true });
    const cancel = vi.fn();
    let chunks = 0;
    const body = new ReadableStream<Uint8Array>({ pull(c) { chunks++; c.enqueue(new Uint8Array(300_000)); }, cancel }, { highWaterMark: 0 });
    safeFetch.mockResolvedValue({ response: { status: 200, headers: new Headers(), body }, finalUrl: "https://example.test/robots.txt" });
    const { POST } = await import("@/app/api/tools/ai-crawler-check/route");
    const res = await POST(new Request("https://example.test/api/tool", { method: "POST", body: JSON.stringify({ url: "https://example.test" }) }));
    expect(res.status).toBe(502);
    expect(chunks).toBe(2);
    expect(cancel).toHaveBeenCalledOnce();
    const { releaseUsage } = await import("@/lib/usage-limits");
    expect(releaseUsage).toHaveBeenCalledOnce();
  });
});
