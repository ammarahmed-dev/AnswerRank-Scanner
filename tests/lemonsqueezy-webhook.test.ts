import { createHmac } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "test-webhook-secret";
const USER = "00000000-0000-0000-0000-000000000001";

type Profile = { plan: string; plan_expires_at: string | null; lemonsqueezy_subscription_id: string | null };

let POST: (req: Request) => Promise<Response>;
let profile: Profile | null;
let patches: Array<Record<string, unknown>>;
let patchStatus: number;
let processedEvents: Set<string>;

beforeAll(async () => {
  process.env.SUPABASE_URL = "https://db.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  process.env.LEMONSQUEEZY_WEBHOOK_SECRET = SECRET;
  process.env.LEMONSQUEEZY_VARIANT_ONETIME = "100";
  process.env.LEMONSQUEEZY_VARIANT_PRO = "200";
  process.env.LEMONSQUEEZY_VARIANT_AGENCY = "300";
  ({ POST } = await import("@/app/api/webhooks/lemonsqueezy/route"));
});

beforeEach(() => {
  profile = { plan: "free", plan_expires_at: null, lemonsqueezy_subscription_id: null };
  patches = [];
  patchStatus = 204;
  processedEvents = new Set();
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    if (url.includes("/rpc/apply_billing_event")) {
      const args = JSON.parse(String(init?.body));
      if (processedEvents.has(args.p_event_id)) return Response.json(false);
      const body = args.p_patch as Record<string, unknown>;
      patches.push(body);
      if (patchStatus < 300 && profile) profile = { ...profile, ...body } as Profile;
      if (patchStatus < 300 && profile) { processedEvents.add(args.p_event_id); return Response.json(true); }
      return new Response("db down", { status: 503 });
    }
    return new Response(JSON.stringify(profile ? [profile] : []), { status: 200 });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function send(eventName: string, data: { id?: string; attributes: Record<string, unknown> }, signature?: string) {
  const body = JSON.stringify({ meta: { event_name: eventName, custom_data: { user_id: USER } }, data });
  const sig = signature ?? createHmac("sha256", SECRET).update(body).digest("hex");
  return POST(new Request("https://www.aeocheck.co/api/webhooks/lemonsqueezy", { method: "POST", body, headers: { "x-signature": sig } }));
}

const sub = (id: string, variant: string, status: string, extra: Record<string, unknown> = {}) => ({
  id,
  attributes: { variant_id: Number(variant), status, ends_at: null, urls: { customer_portal: "https://portal" }, ...extra },
});

describe("lemonsqueezy webhook", () => {
  it.each(["profile", "mutation"])("returns retryable 500 for stalled %s transport without retry or compensation", async boundary => {
    vi.useFakeTimers();
    const fetch = vi.fn(async (url: string) => {
      if (boundary === "profile" || url.includes("/rpc/")) return new Promise<Response>(() => {});
      return Response.json([profile]);
    });
    vi.stubGlobal("fetch", fetch);
    const result = send("subscription_created", sub("s1", "200", "active"));
    await vi.advanceTimersByTimeAsync(10_001);
    expect((await result).status).toBe(500);
    expect(fetch).toHaveBeenCalledTimes(boundary === "profile" ? 1 : 2);
    expect(patches).toHaveLength(0); expect(processedEvents.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects mutation redirects and cancels the unread body without another dispatch", async () => {
    const cancel = vi.fn();
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (!url.includes("/rpc/")) return Response.json([profile]);
      expect(init?.redirect).toBe("error");
      expect(init?.cache).toBe("no-store");
      return new Response(new ReadableStream({ cancel }), { status: 307, headers: { location: "https://other.test/rpc" } });
    });
    vi.stubGlobal("fetch", fetch);
    expect((await send("subscription_created", sub("s1", "200", "active"))).status).toBe(500);
    expect(fetch).toHaveBeenCalledTimes(2); expect(cancel).toHaveBeenCalledOnce();
    expect(processedEvents.size).toBe(0);
  });

  it("keeps a lost committed mutation reply retryable and lets the exact receipt prevent a second mutation", async () => {
    vi.useFakeTimers();
    const database = globalThis.fetch;
    let loseReply = true;
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      const result = await database(url, init);
      if (url.includes("/rpc/") && loseReply) {
        loseReply = false;
        return new Promise<Response>(() => {});
      }
      return result;
    });
    vi.stubGlobal("fetch", fetch);
    const data = sub("s1", "200", "active");
    const first = send("subscription_created", data);
    await vi.advanceTimersByTimeAsync(10_001);
    expect((await first).status).toBe(500);
    expect(profile?.plan).toBe("pro"); expect(patches).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2); // No automatic retry/compensating write.
    expect((await send("subscription_created", data)).status).toBe(200);
    expect(patches).toHaveLength(1); expect(processedEvents.size).toBe(1);
  });

  it("does not apply an exact replay after a later profile change", async () => {
    const data = sub("s1", "200", "active");
    expect((await send("subscription_created", data)).status).toBe(200);
    profile = { plan: "agency", plan_expires_at: null, lemonsqueezy_subscription_id: "s1" };
    const count = patches.length;
    expect((await send("subscription_created", data)).status).toBe(200);
    expect(patches.length).toBe(count);
    expect(profile.plan).toBe("agency");
  });
  it("keeps a failed mutation retryable without a processed receipt", async () => {
    patchStatus = 503;
    const data = sub("s1", "200", "active");
    expect((await send("subscription_created", data)).status).toBe(500);
    expect(processedEvents.size).toBe(0);
    patchStatus = 204;
    expect((await send("subscription_created", data)).status).toBe(200);
    expect(processedEvents.size).toBe(1);
  });
  it("rejects oversized streamed bodies before any persistence", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const cancel = vi.fn();
    const stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(270_000)); }, cancel });
    const req = new Request("https://aeocheck.co/api/test", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    expect((await POST(req)).status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("rejects a signed null root and noncanonical signatures", async () => {
    const raw = "null";
    const signature = createHmac("sha256", SECRET).update(raw).digest("hex");
    expect((await POST(new Request("https://aeocheck.co/api/test", { method: "POST", body: raw, headers: { "x-signature": signature } }))).status).toBe(400);
    expect((await send("subscription_created", sub("s1", "200", "active"), signature + "ZZ")).status).toBe(400);
    expect(patches).toHaveLength(0);
  });
  it("returns a retryable failure when no profile was updated", async () => {
    profile = null;
    expect((await send("subscription_created", sub("s1", "200", "active"))).status).toBe(500);
  });

  it.each(["order_created", "order_refunded", "subscription_created", "subscription_updated"])("keeps missing-profile %s retryable without mutation/receipt", async eventName => {
    profile = null;
    const data = eventName.startsWith("order_")
      ? { id: "o1", attributes: { status: eventName === "order_refunded" ? "refunded" : "paid", first_order_item: { variant_id: 100 } } }
      : sub("s1", "200", "active");
    expect((await send(eventName, data)).status).toBe(500);
    expect(patches).toHaveLength(0); expect(processedEvents.size).toBe(0);
  });
  it.each([{}, { 0: { plan: "free" } }, null, [null], [[]], [{}], [{ plan: "mystery", plan_expires_at: null, lemonsqueezy_subscription_id: null }],
    [{ plan: "pro", plan_expires_at: "bad", lemonsqueezy_subscription_id: "s1" }],
    [{ plan: "pro", plan_expires_at: null, lemonsqueezy_subscription_id: 42 }],
    [{ plan: "free", plan_expires_at: null }],
    [{ plan: "free", plan_expires_at: null, lemonsqueezy_subscription_id: null }, { plan: "agency" }]
  ])("rejects malformed profile authority %j before acknowledgement or persistence", async rows => {
    const fetch = vi.fn(async () => Response.json(rows)); vi.stubGlobal("fetch", fetch);
    expect((await send("order_refunded", { id: "o1", attributes: { status: "refunded", first_order_item: { variant_id: 100 } } })).status).toBe(500);
    expect(fetch).toHaveBeenCalledOnce(); expect(processedEvents.size).toBe(0);
  });
  it("allows a missing-profile refund delivery to be retried after profile recovery", async () => {
    const data = { id: "o1", attributes: { status: "refunded", first_order_item: { variant_id: 100 } } };
    profile = null;
    expect((await send("order_refunded", data)).status).toBe(500);
    expect(processedEvents.size).toBe(0);
    profile = { plan: "onetime", plan_expires_at: null, lemonsqueezy_subscription_id: null };
    expect((await send("order_refunded", data)).status).toBe(200);
    expect(profile.plan).toBe("free"); expect(processedEvents.size).toBe(1);
  });
  it("does not log raw transport failure text or follow profile redirects", async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => { throw new Error("private-provider-body private-customer-id"); });
    vi.stubGlobal("fetch", fetch);
    expect((await send("subscription_created", sub("s1", "200", "active"))).status).toBe(500);
    expect(fetch.mock.calls[0][1]?.redirect).toBe("error");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/private-provider-body|private-customer-id/);
  });

  it("rejects a bad signature", async () => {
    const res = await send("subscription_created", sub("s1", "200", "active"), "00".repeat(32));
    expect(res.status).toBe(400);
    expect(patches).toHaveLength(0);
  });

  it("grants pro on an active subscription", async () => {
    const res = await send("subscription_created", sub("s1", "200", "active"));
    expect(res.status).toBe(200);
    expect(profile).toMatchObject({ plan: "pro", lemonsqueezy_subscription_id: "s1", plan_expires_at: null });
  });

  it("keeps access until ends_at when cancelled, even if a later update arrives", async () => {
    await send("subscription_created", sub("s1", "200", "active"));
    await send("subscription_cancelled", sub("s1", "200", "cancelled", { ends_at: "2026-11-01T00:00:00Z" }));
    await send("subscription_updated", sub("s1", "200", "cancelled", { ends_at: "2026-11-01T00:00:00Z" }));
    expect(profile).toMatchObject({ plan: "pro", plan_expires_at: "2026-11-01T00:00:00Z" });
  });

  it("drops to free when expired or unpaid", async () => {
    await send("subscription_created", sub("s1", "200", "active"));
    await send("subscription_expired", sub("s1", "200", "expired"));
    expect(profile?.plan).toBe("free");
  });

  it("applies a downgrade from agency to pro", async () => {
    await send("subscription_created", sub("s1", "300", "active"));
    await send("subscription_updated", sub("s1", "200", "active"));
    expect(profile?.plan).toBe("pro");
  });

  it("ignores stale events for a replaced subscription", async () => {
    await send("subscription_created", sub("s1", "200", "active"));
    await send("subscription_cancelled", sub("s1", "200", "cancelled", { ends_at: "2026-10-10T00:00:00Z" }));
    await send("subscription_created", sub("s2", "200", "active"));
    expect(profile?.lemonsqueezy_subscription_id).toBe("s2");
    await send("subscription_updated", sub("s1", "200", "active"));
    await send("subscription_expired", sub("s1", "200", "expired"));
    expect(profile).toMatchObject({ plan: "pro", lemonsqueezy_subscription_id: "s2", plan_expires_at: null });
  });

  it("grants onetime on a paid order but never downgrades a subscriber", async () => {
    const order = { id: "o1", attributes: { status: "paid", first_order_item: { variant_id: 100 } } };
    await send("order_created", order);
    expect(profile?.plan).toBe("onetime");
    profile = { plan: "pro", plan_expires_at: null, lemonsqueezy_subscription_id: "s1" };
    await send("order_created", order);
    expect(profile.plan).toBe("pro");
  });

  it("revokes onetime only on a full refund", async () => {
    profile = { plan: "onetime", plan_expires_at: null, lemonsqueezy_subscription_id: null };
    await send("order_refunded", { id: "o1", attributes: { status: "partial_refund", refunded: false, first_order_item: { variant_id: 100 } } });
    expect(profile.plan).toBe("onetime");
    await send("order_refunded", { id: "o1", attributes: { status: "refunded", refunded: true, first_order_item: { variant_id: 100 } } });
    expect(profile.plan).toBe("free");
  });

  it("returns 500 when the database write fails so Lemon Squeezy retries", async () => {
    patchStatus = 503;
    const res = await send("subscription_created", sub("s1", "200", "active"));
    expect(res.status).toBe(500);
  });
});
