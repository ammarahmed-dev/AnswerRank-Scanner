import { afterEach, describe, expect, it, vi } from "vitest";
const { auth, discoverPages } = vi.hoisted(() => ({
  auth: { user: { id: "user-id", email: "owner@example.test" }, plan: "free" },
  discoverPages: vi.fn(async () => ({ urls: ["https://example.test/"], totalDiscovered: 1 })),
}));
vi.mock("@/lib/auth-server", () => ({ getAuthContext: async () => auth }));
vi.mock("@/lib/admin", () => ({ isMasterAdmin: () => false }));
vi.mock("@/lib/supabase-config", () => ({ getSupabaseServerUrl: () => "https://db.test", hasSupabaseConfig: () => true, getSupabaseServiceHeaders: () => ({}) }));
vi.mock("@/lib/page-discovery", () => ({ discoverPages }));
vi.mock("@/lib/url-safety", () => ({ assertPublicUrl: vi.fn() }));
import { POST as audit } from "@/app/api/audit/route";
import { POST as monitor } from "@/app/api/monitor/route";

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); auth.plan = "free"; });
const request = (body: unknown) => new Request("https://aeocheck.co/api/test", { method: "POST", body: JSON.stringify(body) });

describe.each([
  ["audit", audit, { domain: "example.test" }],
  ["monitor", monitor, { url: "https://example.test" }],
] as const)("%s count verification", (_name, handler, body) => {
  it.each([null, "*/*", "garbage", "bad/0"])("fails closed for count header %s", async header => {
    const fetch = vi.fn(async () => new Response("[]", { headers: header ? { "content-range": header } : {} }));
    vi.stubGlobal("fetch", fetch);
    expect((await handler(request(body))).status).toBe(503);
    expect(fetch).toHaveBeenCalledOnce();
    expect(discoverPages).not.toHaveBeenCalled();
  });
  it("does not treat a database error as zero existing entries", async () => {
    const fetch = vi.fn(async () => new Response("{}", { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    expect((await handler(request(body))).status).toBe(503);
    expect(fetch).toHaveBeenCalledOnce();
    expect(discoverPages).not.toHaveBeenCalled();
  });
  it("returns unavailable on a count network error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("Network failed"); }));
    expect((await handler(request(body))).status).toBe(503);
    expect(discoverPages).not.toHaveBeenCalled();
  });
  it("rejects null and oversized payloads before querying counts", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await handler(request(null))).status).toBe(400);
    expect((await handler(request({ ...body, padding: "x".repeat(40_000) }))).status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("successful exact counts", () => {
  it("enforces a genuine exhausted audit count", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("[]", { headers: { "content-range": "0-0/1" } })));
    expect((await audit(request({ domain: "example.test" }))).status).toBe(429);
    expect(discoverPages).not.toHaveBeenCalled();
  });
  it("accepts a verified empty monitor count and inserts once", async () => {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => init?.method === "POST"
      ? new Response(JSON.stringify([{ id: "monitor-id" }]), { status: 201 })
      : new Response("[]", { headers: { "content-range": "*/0" } }));
    vi.stubGlobal("fetch", fetch);
    expect((await monitor(request({ url: "https://example.test" }))).status).toBe(201);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("checks the one-time monthly count before discovery", async () => {
    auth.plan = "onetime";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
    expect((await audit(request({ domain: "example.test" }))).status).toBe(503);
    expect(discoverPages).not.toHaveBeenCalled();
  });
});
