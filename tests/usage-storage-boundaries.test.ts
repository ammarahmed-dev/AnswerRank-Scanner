import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let usage: typeof import("@/lib/usage-limits");
const reservation = { allowed: true, count: 1, remaining: 2, limit: 3, reserved: true, usageDate: "2026-10-01" };

beforeEach(async () => {
  vi.stubEnv("SUPABASE_URL", "https://db.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "private-service-key");
  vi.resetModules();
  usage = await import("@/lib/usage-limits");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function pendingBody() {
  const cancel = vi.fn();
  return { response: new Response(new ReadableStream({ cancel })), cancel };
}

const operations = ["read", "reserve", "release"] as const;
function run(operation: typeof operations[number]) {
  if (operation === "read") return usage.getUsageCount("private-client-key");
  if (operation === "reserve") return usage.reserveUsage("private-client-key", 3);
  return usage.releaseUsage("private-client-key", reservation);
}

describe("quota storage transport boundaries", () => {
  it.each(operations)("%s sets no-store, rejects redirects and cleans its deadline", async operation => {
    vi.useFakeTimers();
    const fetch = vi.fn(async (_url: unknown, _init?: RequestInit) => new Response(operation === "read" ? '[{"scan_count":2}]' : "1"));
    vi.stubGlobal("fetch", fetch);
    await run(operation);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]).toHaveLength(2);
    expect(fetch.mock.calls[0][1]).toMatchObject({ cache: "no-store", redirect: "error", signal: expect.any(AbortSignal) });
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(operations)("%s aborts a stalled header request without retrying", async operation => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const fetch = vi.fn((_url: unknown, init?: RequestInit) => {
      signal = init?.signal as AbortSignal;
      return new Promise<Response>((_resolve, reject) => signal!.addEventListener("abort", () => reject(signal!.reason), { once: true }));
    });
    vi.stubGlobal("fetch", fetch);
    const result = run(operation).then(value => ({ value }), error => ({ error }));
    await vi.advanceTimersByTimeAsync(10_000);
    const outcome = await result;
    expect(signal?.aborted).toBe(true);
    if (operation === "read") expect(outcome).toHaveProperty("error");
    if (operation === "reserve") expect(outcome).toMatchObject({ value: { allowed: false, unavailable: true, reserved: false } });
    if (operation === "release") expect(outcome).toEqual({ value: undefined });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["read", "reserve"] as const)("%s keeps the deadline active through a stalled body", async operation => {
    vi.useFakeTimers();
    const body = pendingBody();
    const fetch = vi.fn(async () => body.response);
    vi.stubGlobal("fetch", fetch);
    const result = run(operation).then(value => ({ value }), error => ({ error }));
    await vi.advanceTimersByTimeAsync(9_999);
    expect(body.cancel).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    const outcome = await result;
    if (operation === "read") expect(outcome).toHaveProperty("error");
    else expect(outcome).toMatchObject({ value: { allowed: false, unavailable: true } });
    expect(body.cancel).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["read", "reserve"] as const)("%s rejects excessive decoded bodies even without Content-Length", async operation => {
    const cancel = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode(" ".repeat(4097))); }, cancel,
    }))));
    if (operation === "read") await expect(run(operation)).rejects.toThrow("byte limit");
    else expect(await run(operation)).toMatchObject({ allowed: false, unavailable: true });
    expect(cancel).toHaveBeenCalled();
  });

  it.each(["read", "reserve"] as const)("%s cancels advertised oversized responses", async operation => {
    const body = pendingBody();
    body.response.headers.set("content-length", "4097");
    vi.stubGlobal("fetch", vi.fn(async () => body.response));
    if (operation === "read") await expect(run(operation)).rejects.toThrow("byte limit");
    else expect(await run(operation)).toMatchObject({ allowed: false, unavailable: true });
    expect(body.cancel).toHaveBeenCalled();
  });

  it.each(operations)("%s cancels unread HTTP error bodies", async operation => {
    const cancel = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new ReadableStream({ cancel }), { status: 503 })));
    if (operation === "read") await expect(run(operation)).rejects.toThrow("unavailable");
    else await run(operation);
    expect(cancel).toHaveBeenCalled();
  });

  it("release cancels an unnecessary success body rather than waiting for it", async () => {
    const body = pendingBody();
    vi.stubGlobal("fetch", vi.fn(async () => body.response));
    await usage.releaseUsage("k", reservation);
    expect(body.cancel).toHaveBeenCalled();
  });

  it("never logs release error messages that may contain credentials or customer keys", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("private-service-key private-client-key"); }));
    await usage.releaseUsage("private-client-key", reservation);
    expect(console.error).toHaveBeenCalledWith("Supabase release_scan_usage error:", "Error");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("private-");
  });

  it.each([{ rows: [] }, { rows: [{ scan_count: 0 }] }, { rows: [{ scan_count: 2 }] }])("preserves valid usage reads $rows", async ({ rows }) => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(rows)));
    expect(await usage.getUsageCount("k")).toBe(rows[0]?.scan_count ?? 0);
  });
});
