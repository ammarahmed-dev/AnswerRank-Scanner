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
      if (init?.method === "PATCH") {
        saved = JSON.parse(String(init.body));
        return new Response(null, { status: 204 });
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
    expect(saved?.aggregate_score).toBe(50);
  });
});
