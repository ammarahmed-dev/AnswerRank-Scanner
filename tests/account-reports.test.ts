import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { toAccountReport } from "@/lib/account-reports";

describe("toAccountReport", () => {
  it("keeps only dashboard fields and derives unlocked and previousScore", () => {
    const mapped = toAccountReport({
      id: "r1", url: "https://a.test/", score: 71, created_at: "2026-10-04T00:00:00Z", retest_count: 2,
      result: { unlockedAt: "2026-10-01", previous: { score: 60 }, aiInsights: { quickWin: "SECRET" } } as never,
    });
    expect(mapped).toEqual({ id: "r1", url: "https://a.test/", score: 71, created_at: "2026-10-04T00:00:00Z", retest_count: 2, max_retests: 3, unlocked: true, previousScore: 60 });
    expect(JSON.stringify(mapped)).not.toContain("SECRET");
  });

  it("defaults when fields are missing", () => {
    expect(toAccountReport({ id: "r2", url: "u", score: 1, created_at: "d", result: null })).toMatchObject({ unlocked: false, previousScore: null, retest_count: 0, max_retests: 3 });
  });
});

const SECRET = "PAID_RECOMMENDATION_TEXT";
let GET: (req: Request) => Promise<Response>;

describe("GET /api/account does not leak paid report content", () => {
  beforeAll(async () => {
    process.env.SUPABASE_URL = "https://db.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    vi.resetModules();
    vi.doMock("@/lib/auth-server", () => ({ getAuthContext: async () => ({ user: { id: "u1", email: "free@user.test" }, plan: "free" }) }));
    vi.doMock("@/lib/usage-limits", () => ({ getUsageCount: async () => 1, getPlanLimit: () => 3 }));
    ({ GET } = await import("@/app/api/account/route"));
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("returns report summaries without the stored result", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/rest/v1/reports")) {
        return new Response(JSON.stringify([{ id: "r1", url: "https://a.test/", score: 55, created_at: "2026-10-04T00:00:00Z", retest_count: 0, max_retests: 3, result: { aiInsights: { quickWin: SECRET, recommendations: [SECRET] }, previous: { score: 50 } } }]), { status: 200 });
      }
      return new Response("[]", { status: 200 });
    });
    const res = await GET(new Request("https://x.test/api/account", { headers: { Authorization: "Bearer t" } }));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain("aiInsights");
    const data = JSON.parse(text) as { reports: Array<Record<string, unknown>> };
    expect(data.reports[0]).toMatchObject({ id: "r1", score: 55, previousScore: 50 });
    expect("result" in data.reports[0]).toBe(false);
  });
});
