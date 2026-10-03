import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

type Mod = typeof import("@/lib/usage-limits");
let mod: Mod;
let calls: Array<{ url: string; method: string; body: unknown }>;

beforeAll(async () => {
  process.env.SUPABASE_URL = "https://db.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  vi.resetModules();
  mod = await import("@/lib/usage-limits");
});

function mockFetch(handler: (url: string, method: string) => Response) {
  calls = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return handler(url, method);
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("reserveUsage", () => {
  it("reserves atomically via RPC", async () => {
    mockFetch(() => new Response("2", { status: 200 }));
    const r = await mod.reserveUsage("k", 3);
    expect(r).toMatchObject({ allowed: true, count: 2, remaining: 1, reserved: true });
    expect(calls[0].url).toBe("https://db.test/rest/v1/rpc/reserve_scan_usage");
    expect(calls[0].body).toMatchObject({ p_client_key: "k", p_limit: 3 });
  });

  it("denies when the RPC reports the limit is reached", async () => {
    mockFetch(() => new Response("-1", { status: 200 }));
    const r = await mod.reserveUsage("k", 3);
    expect(r).toMatchObject({ allowed: false, remaining: 0, reserved: false });
  });

  it("falls back to the legacy check when the function is missing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockFetch((url) =>
      url.includes("/rpc/") ? new Response("{}", { status: 404 }) : new Response(JSON.stringify([{ scan_count: 1 }]), { status: 200 })
    );
    const r = await mod.reserveUsage("k", 3);
    expect(r).toMatchObject({ allowed: true, count: 1, reserved: false });

    mockFetch(() => new Response(null, { status: 201 }));
    await mod.commitUsage("k", r);
    expect(calls[0]).toMatchObject({ url: "https://db.test/rest/v1/scan_usage", method: "POST" });
    expect(calls[0].body).toMatchObject({ client_key: "k", scan_count: 2 });
  });

  it("commit is a no-op and release calls the RPC for atomic reservations", async () => {
    mockFetch(() => new Response("1", { status: 200 }));
    const r = await mod.reserveUsage("k", 3);
    mockFetch(() => new Response(null, { status: 204 }));
    await mod.commitUsage("k", r);
    expect(calls).toHaveLength(0);
    await mod.releaseUsage("k", r);
    expect(calls[0].url).toBe("https://db.test/rest/v1/rpc/release_scan_usage");
    expect(calls[0].body).toMatchObject({ p_client_key: "k", p_usage_date: r.usageDate });
  });

  it("release is a no-op for legacy reservations", async () => {
    mockFetch(() => new Response(null, { status: 204 }));
    await mod.releaseUsage("k", { allowed: true, count: 1, remaining: 2, limit: 3, reserved: false, usageDate: "2026-10-01" });
    expect(calls).toHaveLength(0);
  });
});
