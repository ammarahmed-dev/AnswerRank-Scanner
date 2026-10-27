import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase-config", () => ({ getSupabaseServerUrl: () => "https://db.test", getSupabaseServiceHeaders: () => ({ apikey: "synthetic-service-key" }) }));
import { requestBillingJson } from "@/lib/billing-storage";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("billing storage boundary", () => {
  it("preserves the one POST payload and forces private, nonredirecting service access", async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => Response.json(false));
    vi.stubGlobal("fetch", fetch);
    expect(await requestBillingJson("/rest/v1/rpc/apply_billing_event", { method: "POST", body: "{\"p_event_id\":\"synthetic\"}" })).toBe(false);
    expect(fetch).toHaveBeenCalledExactlyOnceWith("https://db.test/rest/v1/rpc/apply_billing_event", expect.objectContaining({
      method: "POST", body: "{\"p_event_id\":\"synthetic\"}", redirect: "error", cache: "no-store", headers: { apikey: "synthetic-service-key" }, signal: expect.any(AbortSignal),
    }));
  });

  it.each([301, 302, 303, 307, 308, 401, 409, 500])("cancels HTTP %s without consuming or retrying", async status => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ cancel }), { status });
    const fetch = vi.fn(async () => response);
    vi.stubGlobal("fetch", fetch);
    await expect(requestBillingJson("/rest/v1/rpc/apply_billing_event")).rejects.toThrow("unavailable");
    expect(cancel).toHaveBeenCalledOnce(); expect(fetch).toHaveBeenCalledOnce();
  });

  it("rejects an already-followed response defensively", async () => {
    const response = Response.json(true);
    Object.defineProperty(response, "redirected", { value: true });
    const cancel = vi.spyOn(response.body!, "cancel");
    vi.stubGlobal("fetch", vi.fn(async () => response));
    await expect(requestBillingJson("/rest/v1/rpc/apply_billing_event")).rejects.toThrow("unavailable");
    expect(cancel).toHaveBeenCalledOnce();
  });

  it.each([true, false])("bounds oversized %s declared or streamed JSON", async declared => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(16_385)); }, cancel }), { headers: declared ? { "content-length": "16385" } : {} });
    vi.stubGlobal("fetch", vi.fn(async () => response));
    await expect(requestBillingJson("/rest/v1/profiles")).rejects.toThrow("unavailable");
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("settles stalled headers on deadline and cancels a late response", async () => {
    vi.useFakeTimers();
    let resolve!: (response: Response) => void;
    const fetch = vi.fn((_url: string, _init?: RequestInit) => new Promise<Response>(r => { resolve = r; }));
    vi.stubGlobal("fetch", fetch);
    const result = expect(requestBillingJson("/rest/v1/profiles")).rejects.toThrow("unavailable");
    await vi.advanceTimersByTimeAsync(10_000); await result;
    expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
    const cancel = vi.fn();
    resolve(new Response(new ReadableStream({ cancel })));
    await vi.advanceTimersByTimeAsync(0);
    expect(cancel).toHaveBeenCalledOnce(); expect(fetch).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the same total deadline active through body reading and stalled cancellation", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    const response = new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode("[")); }, cancel }));
    let deliver!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(r => { deliver = r; })));
    const result = expect(requestBillingJson("/rest/v1/profiles")).rejects.toThrow("unavailable");
    await vi.advanceTimersByTimeAsync(8_000); deliver(response);
    await vi.advanceTimersByTimeAsync(1_999); expect(cancel).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1); await result;
    expect(cancel).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });

  it("does not wait for failed-response cancellation and redacts arbitrary transport/JSON text", async () => {
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new ReadableStream({ cancel }), { status: 503 })));
    await expect(requestBillingJson("/rest/v1/profiles")).rejects.toThrow(/^Billing storage request is unavailable\.$/);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("private-token customer@example.test"); }));
    await expect(requestBillingJson("/rest/v1/profiles")).rejects.toThrow(/^Billing storage request is unavailable\.$/);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("private-token customer@example.test")));
    await expect(requestBillingJson("/rest/v1/profiles")).rejects.toThrow(/^Billing storage request is unavailable\.$/);
  });

  it("clears the deadline after successful work", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => { signal = init?.signal ?? undefined; return Response.json([]); }));
    expect(await requestBillingJson("/rest/v1/profiles")).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(10_000); expect(signal?.aborted).toBe(false);
  });
});
