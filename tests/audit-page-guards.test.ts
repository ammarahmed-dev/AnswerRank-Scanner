import { afterEach, describe, expect, it, vi } from "vitest";

const { runScanCore } = vi.hoisted(() => ({ runScanCore: vi.fn(async () => ({ score: 0, checks: [], pagespeed: null, categoryScores: {} })) }));
vi.mock("@/lib/auth-server", () => ({ getAuthContext: async () => ({ user: { id: "owner" }, plan: "pro" }) }));
vi.mock("@/lib/scan-core", () => ({ runScanCore }));
vi.mock("@/lib/supabase-config", () => ({ getSupabaseServerUrl: () => "https://db.test", getSupabaseServiceHeaders: () => ({}), hasSupabaseConfig: () => true }));

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("audit page guards", () => {
  async function send(url: string, results: unknown[] = []) {
    let saved: Record<string, unknown> | undefined;
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        saved = JSON.parse(String(init.body));
        return Response.json([{ scanned_pages: 2, total_pages: 2, aggregate_score: 50, complete: true }]);
      }
      return new Response(JSON.stringify([{ id: "audit", status: "running", urls: ["https://example.com/page"], scanned_pages: results.length, total_pages: 2, results }]));
    });
    const { POST } = await import("@/app/api/audit/[id]/scan/route");
    const response = await POST(new Request("https://aeocheck.co/api/audit/audit/scan", { method: "POST", body: JSON.stringify({ url }) }), { params: Promise.resolve({ id: "audit" }) });
    return { response, saved };
  }

  it("rejects a public URL outside the stored audit targets before scanning", async () => {
    const { response, saved } = await send("https://other.com/");
    expect(response.status).toBe(400);
    expect(runScanCore).not.toHaveBeenCalled();
    expect(saved).toBeUndefined();
  });

  it("rejects a page that already has a result", async () => {
    const { response } = await send("https://example.com/page", [{ url: "https://example.com/page", score: 80 }]);
    expect(response.status).toBe(409);
    expect(runScanCore).not.toHaveBeenCalled();
  });

  it("includes a valid zero score in the aggregate", async () => {
    const { response, saved } = await send("https://example.com/page", [{ url: "https://example.com/other", score: 100 }]);
    expect(response.status).toBe(200);
    expect((await response.json()).aggregateScore).toBe(50);
    expect(saved).toMatchObject({ p_audit_id: "audit", p_user_id: "owner", p_page_result: { score: 0 } });
    expect(saved).not.toHaveProperty("results");
  });
});

describe("audit save-time races", () => {
  it.each([["23505", 409], ["55000", 409], ["P0002", 404], ["PGRST202", 503]])("returns save-time database outcome %s without a stale replacement", async (code, status) => {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") return Response.json({ code, message: "private database detail" }, { status: 400 });
      return Response.json([{ id: "audit", status: "running", urls: ["https://example.com/page"], scanned_pages: 0, total_pages: 1, results: [] }]);
    });
    vi.stubGlobal("fetch", fetch);
    const { POST } = await import("@/app/api/audit/[id]/scan/route");
    const response = await POST(new Request("https://aeocheck.co/api/audit/audit/scan", { method: "POST", body: JSON.stringify({ url: "https://example.com/page" }) }), { params: Promise.resolve({ id: "audit" }) });
    expect(response.status).toBe(status);
    expect(await response.text()).not.toContain("private database detail");
    expect(fetch.mock.calls.map(([, init]) => init?.method)).toEqual([undefined, "POST"]);
  });
});
