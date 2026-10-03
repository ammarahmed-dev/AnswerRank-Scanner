import { createHmac } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "test-webhook-secret";
const USER = "00000000-0000-0000-0000-000000000001";

type Profile = { plan: string; plan_expires_at: string | null; lemonsqueezy_subscription_id: string | null };

let POST: (req: Request) => Promise<Response>;
let profile: Profile | null;
let patches: Array<Record<string, unknown>>;
let patchStatus: number;

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
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      patches.push(body);
      if (patchStatus < 300 && profile) profile = { ...profile, ...body } as Profile;
      return new Response(patchStatus < 300 ? null : "db down", { status: patchStatus });
    }
    return new Response(JSON.stringify(profile ? [profile] : []), { status: 200 });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
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
