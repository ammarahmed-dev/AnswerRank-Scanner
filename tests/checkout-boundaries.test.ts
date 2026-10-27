import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trustedCheckoutUrl } from "@/lib/checkout-url";
const { auth } = vi.hoisted(() => ({ auth: vi.fn(async () => ({ user: { id: "owner", email: "synthetic@example.invalid" }, plan: "free" })) }));
vi.mock("@/lib/auth-server", () => ({ getAuthContext: auth }));
import { POST } from "@/app/api/checkout/route";
const valid = "https://test-store.lemonsqueezy.com/checkout/buy/synthetic?signature=unchanged%2Bvalue";
const invalid = [
  "https://evillemonsqueezy.com/checkout", "https://lemonsqueezy.com.attacker.invalid/",
  "http://test-store.lemonsqueezy.com/", "https://token@test-store.lemonsqueezy.com/",
  "https://user:password@test-store.lemonsqueezy.com/", "https://test-store.lemonsqueezy.com:8443/",
  "//test-store.lemonsqueezy.com/", "https:test-store.lemonsqueezy.com/",
  "https:\\test-store.lemonsqueezy.com/", "https://test-store.lemon\nsqueezy.com/",
  " https://lemonsqueezy.com/", "https://lemonsqueezy.com./", "javascript:alert(1)",
  "https://lemonsqueezy.com/?token=" + "x".repeat(8192), {}, 42, null,
];
const req = (signal?: AbortSignal) => new Request("https://aeocheck.co/api/checkout", { method: "POST", body: '{"plan":"pro"}', signal });
beforeEach(() => {
  vi.stubEnv("LEMONSQUEEZY_API_KEY", "synthetic-api-key");
  vi.stubEnv("LEMONSQUEEZY_STORE_ID", "synthetic-store");
  vi.stubEnv("LEMONSQUEEZY_VARIANT_PRO", "synthetic-pro");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("Hosted checkout destination", () => {
  it.each([valid, "https://lemonsqueezy.com/checkout", "https://nested.store.lemonsqueezy.com/buy", "https://STORE.lemonsqueezy.com:443/buy"])("preserves valid signed HTTPS destinations: %s", value => {
    expect(trustedCheckoutUrl(value)).toBe(value);
  });
  it.each(invalid)("rejects an unsafe destination: %j", value => { expect(trustedCheckoutUrl(value)).toBeNull(); });
});
describe("Checkout provider boundary", () => {
  it.each(["onetime", "pro", "agency"])("preserves variant and request behavior for published plan %s", async plan => {
    vi.stubEnv("LEMONSQUEEZY_VARIANT_ONETIME", "synthetic-onetime");
    vi.stubEnv("LEMONSQUEEZY_VARIANT_AGENCY", "synthetic-agency");
    const fetch = vi.fn(async () => Response.json({ data: { attributes: { url: valid } } }));
    vi.stubGlobal("fetch", fetch);
    const res = await POST(new Request("https://aeocheck.co/api/checkout", { method: "POST", body: JSON.stringify({ plan }) }));
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledOnce();
    const call = fetch.mock.calls[0] as unknown as [string, RequestInit];
    const payload = JSON.parse(call[1].body as string);
    expect(payload.data.relationships.variant.data.id).toBe(`synthetic-${plan}`);
    expect(payload.data.attributes.checkout_data.custom.user_id).toBe("owner");
    expect(payload.data.attributes.product_options.redirect_url).toMatch(/\/dashboard\?upgraded=1$/);
  });
  it.each(["free", "guest", "starter", "admin"])("rejects unpublished checkout identifier %s before dispatch", async plan => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const res = await POST(new Request("https://aeocheck.co/api/checkout", { method: "POST", body: JSON.stringify({ plan }) }));
    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("retains signed URL, account, variant, return path and one provider request", async () => {
    const fetch = vi.fn(async () => Response.json({ data: { attributes: { url: valid } } }));
    vi.stubGlobal("fetch", fetch);
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ checkoutUrl: valid });
    expect(fetch).toHaveBeenCalledOnce();
    const init = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(init[1]).toMatchObject({ method: "POST", redirect: "error", signal: expect.any(AbortSignal) });
    const payload = JSON.parse(init[1].body as string);
    expect(payload.data.relationships.variant.data.id).toBe("synthetic-pro");
    expect(payload.data.attributes.checkout_data.custom.user_id).toBe("owner");
    expect(payload.data.attributes.product_options.redirect_url).toMatch(/\/dashboard\?upgraded=1$/);
  });
  it.each(invalid)("never forwards unsafe provider URLs: %j", async value => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data: { attributes: { url: value } } })));
    const res = await POST(req());
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Failed to create checkout." });
  });
  it.each([null, [], "invalid", { data: null }, { data: { attributes: null } }, { data: { url: valid } }])("validates malformed provider envelopes: %j", async body => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(body)));
    const res = await POST(req());
    expect(res.status).toBe(502);
  });
  it("cancels oversized decoded responses before forwarding a checkout URL", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(33_000)); }, cancel });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(stream)));
    expect((await POST(req())).status).toBe(502);
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("cancels non-2xx bodies without reading/logging provider data", async () => {
    const cancel = vi.fn();
    const read = vi.fn();
    const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode("private-checkout-token synthetic@example.invalid")); }, pull: read, cancel });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(stream, { status: 422 })));
    expect((await POST(req())).status).toBe(500);
    expect(cancel).toHaveBeenCalledOnce();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/private-checkout-token|synthetic@example.invalid|synthetic-api-key/);
  });
  it("does not log malformed JSON or transport error details", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response("private-checkout-token synthetic@example.invalid")).mockRejectedValueOnce(new Error("private-checkout-token"));
    vi.stubGlobal("fetch", fetch);
    expect((await POST(req())).status).toBe(502);
    expect((await POST(req())).status).toBe(502);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/private-checkout-token|synthetic@example.invalid/);
  });
  it("aborts a hung fetch at the total deadline without retry", async () => {
    vi.useFakeTimers();
    const abort = vi.fn();
    const fetch = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => init.signal!.addEventListener("abort", () => { abort(); reject(new Error("aborted")); }, { once: true })));
    vi.stubGlobal("fetch", fetch);
    const pending = POST(req());
    await vi.advanceTimersByTimeAsync(15_000);
    expect((await pending).status).toBe(502);
    expect(abort).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("keeps the deadline active while reading a stalled successful body", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"data":')); }, cancel }))));
    const pending = POST(req());
    await vi.advanceTimersByTimeAsync(15_000);
    expect((await pending).status).toBe(502);
    expect(cancel).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("propagates caller cancellation to body reads", async () => {
    const controller = new AbortController(); const cancel = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"data":')); }, cancel }))));
    const pending = POST(req(controller.signal));
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    controller.abort();
    expect((await pending).status).toBe(502);
    expect(cancel).toHaveBeenCalled();
  });
});
