import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const config = vi.hoisted(() => ({ enabled: true }));
vi.mock("@/lib/supabase-config", () => ({
  getSupabaseServerUrl: () => "https://db.test", hasSupabaseConfig: () => config.enabled,
  getSupabaseServiceHeaders: () => ({ Authorization: "Bearer synthetic-service", "Content-Type": "application/json" }),
}));
import { getAuthContext, getUserPlan } from "@/lib/auth-server";
import { authUnavailableResponse } from "@/lib/auth-response";
const user = { id: "owner", email: "private@example.invalid" };
const profile = { plan: "pro", plan_expires_at: null, welcome_email_sent: true, onetime_url: null, onetime_scan_count: 0 };
const req = (signal?: AbortSignal) => new Request("https://www.aeocheck.co/api/scan", { headers: { Authorization: "Bearer private-token" }, signal });
function mockProfile(value: unknown, status = 200) {
  const fetch = vi.fn(async (url: string) => url.includes("/auth/v1/user") ? Response.json(user) : Response.json(value, { status }));
  vi.stubGlobal("fetch", fetch); return fetch;
}
beforeEach(() => { config.enabled = true; vi.stubEnv("INTERNAL_API_SECRET", ""); vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("authoritative account verification", () => {
  it.each(["free", "onetime", "pro", "agency"])("preserves verified %s rights and one-time context", async plan => {
    const fetch = mockProfile([{ ...profile, plan, onetime_url: "https://example.com/", onetime_scan_count: 2 }]);
    expect(await getAuthContext(req())).toEqual({ user, plan, onetimeUrl: "https://example.com/", onetimeScanCount: 2 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("uses Auth server identity, not user-editable metadata, for rights", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("/auth/v1/user") ? Response.json({ ...user, user_metadata: { plan: "agency", isAdmin: true } }) : Response.json([{ ...profile, plan: "free" }])));
    expect((await getAuthContext(req())).plan).toBe("free");
  });
  it.each([400,401,403])("keeps rejected credentials HTTP %s unauthenticated", async status => {
    const fetch = vi.fn(async () => new Response(null, { status })); vi.stubGlobal("fetch", fetch);
    expect(await getAuthContext(req())).toEqual({ user: null, plan: "guest" });
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("keeps anonymous requests available without a configured auth backend", async () => {
    config.enabled = false; const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await getAuthContext(new Request("https://x.test/"))).toEqual({ user: null, plan: "guest" });
    expect(await getAuthContext(req())).toEqual({ user: null, plan: "guest", unavailable: true });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([429,500,503])("does not convert Auth HTTP %s to a guest", async status => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status })));
    expect(await getAuthContext(req())).toEqual({ user: null, plan: "guest", unavailable: true });
  });
  it.each([401,403,429,500,503])("does not convert profile HTTP %s to Free or bootstrap a profile", async status => {
    const fetch = mockProfile({ private: "do not log" }, status);
    const result = await getAuthContext(req());
    expect(result).toEqual({ user: null, plan: "guest", unavailable: true });
    expect(fetch).toHaveBeenCalledTimes(2);
    const response = authUnavailableResponse(result)!;
    expect(response.status).toBe(503); expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).not.toMatch(/private|token|guest|free/i);
  });
  it.each([null, {}, [profile, profile], [{ ...profile, plan: "admin" }], [{ ...profile, plan_expires_at: "bad" }], [{ ...profile, onetime_scan_count: -1 }], [{ ...profile, onetime_scan_count: "3" }], [{ ...profile, onetime_url: {} }]])("rejects malformed/ambiguous profile authority: %j", async value => {
    mockProfile(value); expect((await getAuthContext(req())).unavailable).toBe(true);
  });
  it.each([null, [], {}, { id: 42 }, { id: "owner", email: {} }])("keeps malformed Auth success responses unavailable: %j", async value => {
    const fetch = vi.fn(async () => Response.json(value)); vi.stubGlobal("fetch", fetch);
    expect((await getAuthContext(req())).unavailable).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("preserves the existing valid expiration rule", async () => {
    mockProfile([{ ...profile, plan_expires_at: "2020-01-01T00:00:00Z" }]);
    expect((await getAuthContext(req())).plan).toBe("free");
  });
  it("requires successful profile creation and authoritative readback, preserving a concurrent paid row", async () => {
    let reads = 0;
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/auth/v1/user")) return Response.json(user);
      if (init?.method === "POST") return new Response(null, { status: 201 });
      return Response.json(++reads === 1 ? [] : [{ ...profile, plan: "agency" }]);
    }); vi.stubGlobal("fetch", fetch);
    expect((await getAuthContext(req())).plan).toBe("agency");
    const writes = fetch.mock.calls.filter(([,init]) => init?.method === "POST");
    expect(writes).toHaveLength(1); expect(writes[0][1]?.headers).toMatchObject({ Prefer: "resolution=ignore-duplicates" });
  });
  it.each(["failed", "missing", "lost_reply"])("does not invent a Free account after %s bootstrap", async mode => {
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/auth/v1/user")) return Response.json(user);
      if (init?.method === "POST") { if (mode === "lost_reply") throw new Error("private-token"); return new Response(null, { status: mode === "failed" ? 500 : 201 }); }
      return Response.json([]);
    }); vi.stubGlobal("fetch", fetch);
    expect((await getAuthContext(req())).unavailable).toBe(true);
    expect(fetch.mock.calls.filter(([,init]) => init?.method === "POST")).toHaveLength(1);
  });
  it("caps decoded Auth and profile responses, cancelling oversized bodies", async () => {
    for (const stage of ["auth", "profile"]) {
      const cancel = vi.fn();
      const stream = () => new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(70_000)); }, cancel });
      vi.stubGlobal("fetch", vi.fn(async (url: string) => stage === "auth" || !url.includes("/auth/v1/user") ? new Response(stream()) : Response.json(user)));
      expect((await getAuthContext(req())).unavailable).toBe(true);
      expect(cancel).toHaveBeenCalled();
    }
  });
  it("keeps its deadline active through a stalled profile body", async () => {
    vi.useFakeTimers(); const cancel = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("/auth/v1/user") ? Response.json(user) : new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('[{"plan":')); }, cancel }))));
    const work = getAuthContext(req()); await vi.advanceTimersByTimeAsync(10_000);
    expect((await work).unavailable).toBe(true); expect(cancel).toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it("settles a transport ignoring abort and cancels its late response without further work", async () => {
    vi.useFakeTimers(); let complete!: (r: Response) => void;
    const fetch = vi.fn(() => new Promise<Response>(resolve => { complete=resolve; })); vi.stubGlobal("fetch", fetch);
    const work = getAuthContext(req()); await vi.advanceTimersByTimeAsync(10_000);
    expect((await work).unavailable).toBe(true);
    const cancel = vi.fn(); complete(new Response(new ReadableStream({ cancel })));
    await vi.advanceTimersByTimeAsync(1); expect(cancel).toHaveBeenCalled(); expect(fetch).toHaveBeenCalledOnce();
  });
  it("propagates caller cancellation before profile creation", async () => {
    const controller = new AbortController(); controller.abort(); const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await getAuthContext(req(controller.signal))).unavailable).toBe(true); expect(fetch).not.toHaveBeenCalled();
  });
  it("does not log identity, tokens, provider bodies or raw transport errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("private-token private@example.invalid synthetic-service"); }));
    await getAuthContext(req());
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/private-token|private@example|synthetic-service/);
  });
  it("does not let a best-effort welcome marker failure change verified rights", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") throw new Error("private-token");
      return Response.json(url.includes("/auth/v1/user") ? user : [{ ...profile, welcome_email_sent: false }]);
    }));
    expect((await getAuthContext(req())).plan).toBe("pro");
  });
  it("retains verified rights when a welcome marker stalls, without dispatching a late notification", async () => {
    vi.useFakeTimers(); vi.stubEnv("INTERNAL_API_SECRET", "synthetic-secret");
    let complete!: (r: Response) => void;
    const fetch = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") return new Promise<Response>(resolve => { complete = resolve; });
      return Promise.resolve(Response.json(url.includes("/auth/v1/user") ? user : [{ ...profile, welcome_email_sent: false }]));
    }); vi.stubGlobal("fetch", fetch);
    const work = getAuthContext(req()); await vi.advanceTimersByTimeAsync(10_000);
    expect((await work).plan).toBe("pro");
    complete(new Response(null, { status: 204 })); await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it("uses one body-active shared deadline and rejects unexpected redirects", async () => {
    const fetch = vi.fn(async (url: string, _init?: RequestInit) => Response.json(url.includes("/auth/v1/user") ? user : [profile])); vi.stubGlobal("fetch", fetch);
    await getAuthContext(req());
    expect(fetch.mock.calls.every(([,init]) => init?.redirect === "error" && init.signal instanceof AbortSignal)).toBe(true);
    expect(fetch.mock.calls[0][1]?.signal).toBe(fetch.mock.calls[1][1]?.signal);
  });
  it("never returns a Free plan from the standalone helper on failed/missing authority", async () => {
    mockProfile([],500); await expect(getUserPlan("owner")).rejects.toThrow("temporarily unavailable");
    mockProfile([]); await expect(getUserPlan("owner")).rejects.toThrow();
  });
});
