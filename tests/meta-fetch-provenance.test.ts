import { beforeEach, describe, expect, it, vi } from "vitest";
const { safeFetch, reserveUsage, commitUsage, releaseUsage } = vi.hoisted(() => ({ safeFetch: vi.fn(), reserveUsage: vi.fn(), commitUsage: vi.fn(), releaseUsage: vi.fn() }));
vi.mock("@/lib/url-safety", () => ({ assertPublicUrl: vi.fn(), safeFetch, pinnedFetch: vi.fn() }));
vi.mock("@/lib/auth-server", () => ({ getAuthContext: async () => ({ user: null, plan: "guest" }) }));
vi.mock("@/lib/usage-limits", () => ({ reserveUsage, commitUsage, releaseUsage, getClientKey: () => "fixture" }));
import { POST } from "@/app/api/tools/meta-tag-checker/route";
import { buildMetaReport } from "@/lib/meta-check";
const requested = "https://short.example/start";
const fetched = "https://destination.example/articles/page";
const html = '<html lang="en"><head><title>Destination article title for a metadata report</title><link rel="canonical" href="https://destination.example/articles/page"><meta property="og:url" content="https://destination.example/articles/page"></head><body>Example.</body></html>';
const request = (url = requested) => new Request("https://aeocheck.test/api/tools/meta-tag-checker", { method: "POST", body: JSON.stringify({ url }) });
beforeEach(() => { vi.clearAllMocks(); reserveUsage.mockResolvedValue({ allowed: true }); commitUsage.mockResolvedValue(undefined); });
describe("metadata fetch-source evidence", () => {
  it("preserves requested identity while grading redirected HTML at its actual fetched destination", async () => {
    safeFetch.mockResolvedValue({ response: new Response(html, { headers: { "content-type": "text/html" } }), finalUrl: fetched });
    const res = await POST(request());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(buildMetaReport(html, requested).checks.find(c => c.id === 'canonical')?.status).toBe('warn');
    expect(data.checks.find((c: { id: string }) => c.id === 'canonical').status).toBe('pass');
    expect(data).toMatchObject({ url: requested, fetchedUrl: fetched });
    expect(data.values).toEqual(buildMetaReport(html, fetched).values);
    expect(data.checks).toEqual(buildMetaReport(html, fetched).checks);
    expect(safeFetch).toHaveBeenCalledTimes(1);
    expect(safeFetch.mock.calls[0][0]).toBe(requested);
    expect(commitUsage).toHaveBeenCalledTimes(1);
    expect(releaseUsage).not.toHaveBeenCalled();
  });
  it("keeps every value and check unchanged for direct fetches", async () => {
    for (const document of [html, '<html><title>Short</title></html>', '<html><link rel="canonical" href="/articles/page"><meta name="robots" content="noindex"></html>']) {
      safeFetch.mockResolvedValue({ response: new Response(document, { headers: { "content-type": "text/html" } }), finalUrl: fetched });
      const data = await (await POST(request(fetched))).json();
      expect(data).toEqual({ url: fetched, fetchedUrl: fetched, ...buildMetaReport(document, fetched) });
    }
  });
  it("retains a genuine cross-domain canonical warning on the fetched page", async () => {
    const foreign = html.replace('rel="canonical" href="https://destination.example/articles/page"', 'rel="canonical" href="https://publisher.example/original"');
    safeFetch.mockResolvedValue({ response: new Response(foreign, { headers: { "content-type": "text/html" } }), finalUrl: fetched });
    const data = await (await POST(request())).json();
    expect(data.checks.find((c: { id: string }) => c.id === 'canonical')).toMatchObject({ status: 'warn', detail: 'Canonical points to another domain (publisher.example)' });
  });
  it("does not invent source evidence or commit usage after a failed fetch", async () => {
    safeFetch.mockRejectedValue(new Error('Synthetic unavailable'));
    const res = await POST(request());
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data).not.toHaveProperty('fetchedUrl');
    expect(data).not.toHaveProperty('values');
    expect(commitUsage).not.toHaveBeenCalled();
    expect(releaseUsage).toHaveBeenCalledTimes(1);
  });
});
