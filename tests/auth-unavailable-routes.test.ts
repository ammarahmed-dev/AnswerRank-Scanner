import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { auth, reserve, reads } = vi.hoisted(() => ({
  auth: vi.fn(), reserve: vi.fn(), reads: vi.fn(),
}));
vi.mock("@/lib/auth-server", () => ({ getAuthContext: auth }));
vi.mock("@/lib/supabase-config", () => ({ hasSupabaseConfig: () => true, getSupabaseServerUrl: () => "https://db.test", getSupabaseServiceHeaders: () => ({}) }));
vi.mock("@/lib/usage-limits", () => ({ reserveUsage: reserve, getUsageCount: reads, commitUsage: vi.fn(), releaseUsage: vi.fn(), getPlanLimit: vi.fn(), getClientKey: vi.fn() }));
vi.mock("@/lib/url-safety", () => ({ assertPublicUrl: async () => new URL("https://example.com"), safeFetch: vi.fn() }));
vi.mock("@/lib/report-db", () => ({ getReportRecord: async () => ({ id: "fixture", url: "https://example.com", user_id: "owner" }), saveReportRecord: vi.fn() }));

const routes = [
  ["account", "GET", () => import("@/app/api/account/route")],
  ["checkout", "POST", () => import("@/app/api/checkout/route")],
  ["scan", "POST", () => import("@/app/api/scan/route")],
  ["compare", "POST", () => import("@/app/api/compare/route")],
  ["compare-history", "GET", () => import("@/app/api/compare-history/route")],
  ["health", "GET", () => import("@/app/api/health/route")],
  ["ai-visibility", "GET", () => import("@/app/api/ai-visibility/route")],
  ["ai-visibility", "POST", () => import("@/app/api/ai-visibility/route")],
  ["admin/summary", "GET", () => import("@/app/api/admin/summary/route")],
  ["admin/users", "GET", () => import("@/app/api/admin/users/route")],
  ["audit", "POST", () => import("@/app/api/audit/route")],
  ["audit/history", "GET", () => import("@/app/api/audit/history/route")],
  ["audit/fixture", "GET", () => import("@/app/api/audit/[id]/route")],
  ["audit/fixture/scan", "POST", () => import("@/app/api/audit/[id]/scan/route")],
  ["reports/fixture", "GET", () => import("@/app/api/reports/[id]/route")],
  ["reports/fixture/retest", "POST", () => import("@/app/api/reports/[id]/retest/route")],
  ["monitor", "GET", () => import("@/app/api/monitor/route")],
  ["monitor", "POST", () => import("@/app/api/monitor/route")],
  ["monitor/fixture", "PATCH", () => import("@/app/api/monitor/[id]/route")],
  ["monitor/fixture", "DELETE", () => import("@/app/api/monitor/[id]/route")],
  ["monitor/fixture/history", "GET", () => import("@/app/api/monitor/[id]/history/route")],
  ["monitor/fixture/scan", "POST", () => import("@/app/api/monitor/[id]/scan/route")],
  ["tools/robots-tester", "POST", () => import("@/app/api/tools/robots-tester/route")],
  ["tools/meta-tag-checker", "POST", () => import("@/app/api/tools/meta-tag-checker/route")],
  ["tools/schema-checker", "POST", () => import("@/app/api/tools/schema-checker/route")],
  ["tools/sitemap-checker", "POST", () => import("@/app/api/tools/sitemap-checker/route")],
  ["tools/llms-txt", "POST", () => import("@/app/api/tools/llms-txt/route")],
  ["tools/ai-crawler-check", "POST", () => import("@/app/api/tools/ai-crawler-check/route")],
  ["tools/content-extractability", "POST", () => import("@/app/api/tools/content-extractability/route")],
] as const;
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("AI_VISIBILITY_ENABLED", "true");
  // Even stale paid/admin-looking identity cannot bypass an explicit unavailable result.
  auth.mockResolvedValue({ user: { id: "owner", email: "private@example.invalid" }, plan: "agency", unavailable: true });
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("Unexpected downstream fetch"); }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("all authenticated API entry points stop on unavailable verification", () => {
  it.each(routes)("%s %s returns retryable 503 before quota, provider or mutation work", async (path, method, load) => {
    const handlers = await load() as unknown as Record<string, (req: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>>;
    const request = new Request(`https://www.aeocheck.co/api/${path}`, { method, headers: { Authorization: "Bearer private-token", "Content-Type": "application/json" },
      ...(method === "GET" ? {} : { body: JSON.stringify({ url: "https://example.com", urls: ["https://example.com", "https://example.org"], agent: "GPTBot", plan: "pro", frequency: "weekly", brandName: "Example", domain: "example.com", prompts: ["question"] }) }),
    });
    const response = await handlers[method](request, { params: Promise.resolve({ id: "fixture" }) });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Account verification is temporarily unavailable. Please try again shortly." });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(auth).toHaveBeenCalledOnce(); expect(reserve).not.toHaveBeenCalled(); expect(reads).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
});
