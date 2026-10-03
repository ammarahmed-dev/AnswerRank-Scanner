import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseServerUrl, getSupabaseServiceHeaders } from "@/lib/supabase-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = getSupabaseServerUrl();

type PaidPlan = "onetime" | "pro" | "agency";

type Profile = {
  plan: string;
  lemonsqueezy_subscription_id: string | null;
};

// Lemon Squeezy subscription statuses: https://docs.lemonsqueezy.com/api/subscriptions
const ACTIVE_STATUSES = new Set(["active", "on_trial", "past_due"]);
const INACTIVE_STATUSES = new Set(["expired", "unpaid", "paused"]);

const PLAN_RANK: Record<string, number> = { free: 0, onetime: 1, pro: 2, agency: 3 };

function variantToPlan(variantId: string): PaidPlan | null {
  if (!variantId) return null;
  if (variantId === process.env.LEMONSQUEEZY_VARIANT_ONETIME) return "onetime";
  if (variantId === process.env.LEMONSQUEEZY_VARIANT_PRO) return "pro";
  if (variantId === process.env.LEMONSQUEEZY_VARIANT_AGENCY) return "agency";
  return null;
}

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  try {
    const digestBuf = Buffer.from(createHmac("sha256", secret).update(rawBody, "utf8").digest("hex"), "hex");
    const sigBuf = Buffer.from(signature, "hex");
    if (digestBuf.length !== sigBuf.length) return false;
    return timingSafeEqual(digestBuf, sigBuf);
  } catch {
    return false;
  }
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=plan,lemonsqueezy_subscription_id`,
    { headers: getSupabaseServiceHeaders(), cache: "no-store" }
  );
  if (!res.ok) throw new Error(`profile fetch failed: ${res.status}`);
  const rows = (await res.json()) as Array<Partial<Profile>>;
  const row = rows[0];
  if (!row) return null;
  return { plan: row.plan ?? "free", lemonsqueezy_subscription_id: row.lemonsqueezy_subscription_id ?? null };
}

async function patchProfile(userId: string, fields: Record<string, unknown>) {
  const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: {
      ...getSupabaseServiceHeaders(),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`profile patch failed: ${res.status} ${body.slice(0, 200)}`);
  }
}

async function handleOrderCreated(userId: string, attrs: Record<string, unknown>) {
  const firstItem = (attrs.first_order_item ?? {}) as Record<string, unknown>;
  const plan = variantToPlan(String(firstItem.variant_id ?? ""));
  if (plan !== "onetime") return; // subscription orders are handled by subscription_* events
  if (attrs.status && attrs.status !== "paid") return;

  const profile = await fetchProfile(userId);
  const currentPlan = profile?.plan ?? "free";
  if ((PLAN_RANK[currentPlan] ?? 0) > PLAN_RANK.onetime) {
    console.info(`[ls-webhook] order_created skipped: user ${userId} already on ${currentPlan}`);
    return;
  }
  await patchProfile(userId, { plan: "onetime", plan_expires_at: null });
  console.info("[ls-webhook] order_created -> plan=onetime user:", userId);
}

async function handleOrderRefunded(userId: string, attrs: Record<string, unknown>) {
  const firstItem = (attrs.first_order_item ?? {}) as Record<string, unknown>;
  const plan = variantToPlan(String(firstItem.variant_id ?? ""));
  if (plan !== "onetime") return; // subscription refunds arrive as subscription status changes

  const profile = await fetchProfile(userId);
  if (profile?.plan !== "onetime") return;
  await patchProfile(userId, { plan: "free", plan_expires_at: null });
  console.info("[ls-webhook] order_refunded -> plan=free user:", userId);
}

async function handleSubscriptionEvent(
  eventName: string,
  userId: string,
  subscriptionId: string | null,
  attrs: Record<string, unknown>
) {
  const plan = variantToPlan(String(attrs.variant_id ?? ""));
  if (plan !== "pro" && plan !== "agency") {
    console.warn(`[ls-webhook] ${eventName}: unknown variant ${String(attrs.variant_id ?? "")}`);
    return;
  }

  const status = String(attrs.status ?? "");
  const endsAt = typeof attrs.ends_at === "string" ? attrs.ends_at : null;
  const portalUrl = (attrs.urls as Record<string, string> | undefined)?.customer_portal ?? null;

  const profile = await fetchProfile(userId);
  const storedSubscriptionId = profile?.lemonsqueezy_subscription_id ?? null;
  // Ignore events for an older subscription once the user has moved to a new one.
  const isCurrentSubscription = !storedSubscriptionId || !subscriptionId || storedSubscriptionId === subscriptionId;

  if (ACTIVE_STATUSES.has(status)) {
    if (!isCurrentSubscription && (PLAN_RANK[profile?.plan ?? "free"] ?? 0) > PLAN_RANK[plan]) {
      console.info(`[ls-webhook] ${eventName} skipped: stale subscription ${subscriptionId} for user ${userId}`);
      return;
    }
    await patchProfile(userId, {
      plan,
      lemonsqueezy_subscription_id: subscriptionId,
      lemonsqueezy_portal_url: portalUrl,
      plan_expires_at: null,
    });
    console.info(`[ls-webhook] ${eventName} status=${status} -> plan=${plan} user:`, userId);
    return;
  }

  if (!isCurrentSubscription) {
    console.info(`[ls-webhook] ${eventName} status=${status} skipped: stale subscription ${subscriptionId}`);
    return;
  }

  if (status === "cancelled") {
    // Access continues until the end of the paid period.
    await patchProfile(userId, {
      plan,
      lemonsqueezy_portal_url: portalUrl,
      plan_expires_at: endsAt ?? new Date().toISOString(),
    });
    console.info(`[ls-webhook] ${eventName} status=cancelled ends_at=${endsAt} user:`, userId);
    return;
  }

  if (INACTIVE_STATUSES.has(status)) {
    await patchProfile(userId, { plan: "free", plan_expires_at: null });
    console.info(`[ls-webhook] ${eventName} status=${status} -> plan=free user:`, userId);
    return;
  }

  console.warn(`[ls-webhook] ${eventName}: unhandled status "${status}" user:`, userId);
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    console.warn("[ls-webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    meta?: { event_name?: string; custom_data?: Record<string, unknown> };
    data?: { id?: string | number; attributes?: Record<string, unknown> };
  };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = event.meta?.event_name ?? "";
  const userId = String(event.meta?.custom_data?.user_id ?? "").trim();
  const attrs = event.data?.attributes ?? {};
  const dataId = event.data?.id != null ? String(event.data.id) : null;

  if (!userId) {
    console.warn("[ls-webhook] No user_id in custom_data for event:", eventName);
    return NextResponse.json({ ok: true });
  }

  try {
    switch (eventName) {
      case "order_created":
        await handleOrderCreated(userId, attrs);
        break;
      case "order_refunded":
        await handleOrderRefunded(userId, attrs);
        break;
      case "subscription_created":
      case "subscription_updated":
      case "subscription_cancelled":
      case "subscription_resumed":
      case "subscription_expired":
      case "subscription_paused":
      case "subscription_unpaused":
        await handleSubscriptionEvent(eventName, userId, dataId, attrs);
        break;
      default:
        // subscription_payment_* events carry invoices; the status change arrives as subscription_updated.
        break;
    }
  } catch (err) {
    console.error("[ls-webhook] Handler error:", eventName, err instanceof Error ? err.message : err);
    // Non-2xx makes Lemon Squeezy retry, so a transient DB failure does not lose a payment.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
