import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase-config", () => ({ getSupabaseServerUrl: () => "https://db.test", getSupabaseServiceHeaders: () => ({}) }));
import { applyBillingEvent } from "@/lib/billing-persistence";
const input = { eventId: "a".repeat(64), userId: "owner", expected: { plan: "free", plan_expires_at: null, lemonsqueezy_subscription_id: null }, patch: { plan: "pro" } };
afterEach(() => { vi.unstubAllGlobals(); });
describe("billing persistence client", () => {
  it.each([true, false])("accepts committed or duplicate result %s", async result => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => Response.json(result));
    vi.stubGlobal("fetch", fetch);
    expect(await applyBillingEvent(input)).toBe(result);
    expect(fetch.mock.calls[0][0]).toContain("/rpc/apply_billing_event");
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toMatchObject({ p_expected: input.expected, p_patch: input.patch, p_event_id: input.eventId });
  });
  it.each([404, 409, 503])("fails closed for HTTP %s without a direct profile-write fallback", async status => {
    const fetch = vi.fn(async () => new Response("unavailable", { status }));
    vi.stubGlobal("fetch", fetch);
    await expect(applyBillingEvent(input)).rejects.toThrow("unavailable");
    expect(fetch).toHaveBeenCalledOnce();
  });
  it.each([null, [], {}, "true"])("rejects nonboolean success %j", async result => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(result)));
    await expect(applyBillingEvent(input)).rejects.toThrow("invalid result");
  });
});
