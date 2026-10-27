import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { describeAiCrawlerAccess } from "@/lib/robots";
import { crawlerVerdict } from "@/app/tools/ai-crawler-checker/AiCrawlerChecker";
const { safeFetch, reserve, commit, release } = vi.hoisted(() => ({ safeFetch: vi.fn(), reserve: vi.fn(), commit: vi.fn(), release: vi.fn() }));
vi.mock("@/lib/auth-server", () => ({ getAuthContext: async () => ({ user: null, plan: "guest" }) }));
vi.mock("@/lib/usage-limits", () => ({ reserveUsage: reserve, commitUsage: commit, releaseUsage: release, getClientKey: () => "fixture" }));
vi.mock("@/lib/url-safety", () => ({ assertPublicUrl: async () => undefined, safeFetch }));
import { POST } from "@/app/api/tools/ai-crawler-check/route";
const req = (url = "https://example.com/private?mode=secret#fragment", signal?: AbortSignal) => new Request("https://local.test/api/tool", { method: "POST", body: JSON.stringify({ url }), signal });
const token = (rows: ReturnType<typeof describeAiCrawlerAccess>, name = "oai-searchbot") => rows.find(r => r.token === name)!;
const policy = "User-agent: *\nDisallow: /private?mode=secret$\nAllow: /private?mode=public$\n";
beforeEach(() => { vi.clearAllMocks(); reserve.mockResolvedValue({ allowed: true, reserved: true }); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
function response(body: string, status = 200, type = "text/plain") {
  safeFetch.mockResolvedValue({ response: new Response(body, { status, headers: { "content-type": type } }), finalUrl: "https://cdn.example/policy" });
}
describe("crawler page rule evidence", () => {
  it.each([["/", true], ["/private?mode=secret", false], ["/private?mode=public", true], ["/private?mode=secret&other=1", true]])("uses path/query and end anchors for %s", (path, allowed) => {
    expect(token(describeAiCrawlerAccess(policy, path))).toMatchObject({ allowed, source: "wildcard" });
  });
  it("preserves own-group selection and Allow tie handling for page paths", () => {
    const body = "User-agent: *\nDisallow: /\nUser-agent: OAI-SearchBot\nDisallow: /private*\nAllow: /private*\n";
    expect(token(describeAiCrawlerAccess(body, "/private/a"))).toMatchObject({ allowed: true, source: "own" });
    expect(token(describeAiCrawlerAccess(body, "/private/a"), "gptbot").allowed).toBe(false);
  });
  it("uses the normalized submitted URL while a redirected robots policy stays scoped to its requested origin", async () => {
    response(policy);
    const res = await POST(req()); const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toMatchObject({ origin: "https://example.com", checkedUrl: "https://example.com/private?mode=secret", requestedRobotsUrl: "https://example.com/robots.txt", robotsUrl: "https://cdn.example/policy", found: true });
    expect(token(data.crawlers).allowed).toBe(false);
    expect(safeFetch.mock.calls[0][0]).toBe("https://example.com/robots.txt");
    expect(safeFetch).toHaveBeenCalledOnce(); expect(commit).toHaveBeenCalledOnce(); expect(release).not.toHaveBeenCalled();
  });
  it.each(["<html>Access denied</html>", "<!doctype html><body>User-agent: *\nAllow: /</body>"])("does not turn an HTML error page into default crawler permission", async body => {
    response(body); const res = await POST(req()); const data = await res.json();
    expect(res.status).toBe(502); expect(data.crawlers).toBeUndefined(); expect(data.found).toBeUndefined();
    expect(release).toHaveBeenCalledOnce(); expect(commit).not.toHaveBeenCalled();
  });
  it.each(["text/html", "application/xhtml+xml", "application/json"])("rejects unverified content type %s", async type => {
    response(type === "application/json" ? '{"error":"denied"}' : "User-agent: *\nAllow: /", 200, type);
    expect((await POST(req())).status).toBe(502); expect(commit).not.toHaveBeenCalled();
  });
  it.each([403, 410, 429, 503])("keeps HTTP %s unavailable instead of reporting absence/default permission", async status => {
    response("unavailable", status);
    const res = await POST(req()); expect(res.status).toBe(502); expect((await res.json()).crawlers).toBeUndefined(); expect(release).toHaveBeenCalledOnce();
  });
  it("reports only HTTP404 as absent, with default-rule results and checked page scope", async () => {
    response("missing", 404);
    const data = await (await POST(req())).json();
    expect(data.found).toBe(false); expect(data.checkedUrl).toBe("https://example.com/private?mode=secret");
    expect(data.crawlers.every((r: { source: string; allowed: boolean }) => r.source === "default" && r.allowed)).toBe(true);
    expect(commit).toHaveBeenCalledOnce(); expect(release).not.toHaveBeenCalled();
  });
  it.each(["", "# no restrictions\n"])("accepts a valid empty/comment-only text policy", async body => {
    response(body); expect((await POST(req())).status).toBe(200); expect(commit).toHaveBeenCalledOnce();
  });
  it("keeps the eight-second deadline active through body consumption", async () => {
    vi.useFakeTimers();
    vi.spyOn(AbortSignal, "timeout").mockImplementation(ms => { const controller = new AbortController(); setTimeout(() => controller.abort(), ms); return controller.signal; });
    const cancel = vi.fn();
    safeFetch.mockResolvedValue({ response: { status: 200, headers: new Headers({ "content-type": "text/plain" }), body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode("User-agent: *\n")); }, cancel }) }, finalUrl: "https://example.com/robots.txt" });
    const work = POST(req()); await vi.advanceTimersByTimeAsync(8000);
    expect((await work).status).toBe(502); expect(cancel).toHaveBeenCalled(); expect(release).toHaveBeenCalledOnce(); expect(commit).not.toHaveBeenCalled();
  });
  it("propagates caller cancellation to streamed policy reads", async () => {
    const controller = new AbortController(); const cancel = vi.fn();
    safeFetch.mockImplementation(async (_url: string, init: RequestInit) => {
      expect(init.signal?.aborted).toBe(false);
      return { response: { status: 200, headers: new Headers({ "content-type": "text/plain" }), body: new ReadableStream({ pull() { controller.abort(); }, cancel }) }, finalUrl: "https://example.com/robots.txt" };
    });
    expect((await POST(req(undefined, controller.signal))).status).toBe(502); expect(cancel).toHaveBeenCalled(); expect(commit).not.toHaveBeenCalled();
  });
  it.each(["", "User-agent: GPTBot\nDisallow: /", "User-agent: OAI-SearchBot\nDisallow: /"])("does not infer actual AI visibility or training outcomes from rules", body => {
    const result = crawlerVerdict(describeAiCrawlerAccess(body));
    expect(result.title + result.text).not.toMatch(/Visible in AI search|cannot appear|keeps your content out|site root/);
    expect(result.text).toMatch(/not (a test|verified)|does not verify/);
  });
  it("distinguishes a missing policy from verified permission", () => {
    expect(crawlerVerdict(describeAiCrawlerAccess(""), false)).toMatchObject({ tone: "warn", title: "No robots policy found (HTTP 404)" });
  });
});
