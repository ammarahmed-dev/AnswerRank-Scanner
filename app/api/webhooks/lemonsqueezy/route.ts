import { BodyTooLargeError, readBoundedText } from "@/lib/bounded-body";
import { applyBillingEvent } from "@/lib/billing-persistence";
import { requestBillingJson } from "@/lib/billing-storage";
import { NextResponse } from "next/server";
import { createHash, createHmac, timingSafeEqual } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaidPlan = "onetime" | "pro" | "agency";

type Profile = {
  plan: string;
  plan_expires_at: string | null;
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
  if (!secret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  try {
    const digestBuf = Buffer.from(createHmac("sha256", secret).update(rawBody, "utf8").digest("hex"), "hex");
    const sigBuf = Buffer.from(signature, "hex");
    if (digestBuf.length !== sigBuf.length) return false;
    return timingSafeEqual(digestBuf, sigBuf);
  } catch {
    return false;
  }
}

async function fetchProfile(userId: string): Promise<Profile> {
  const rows = await requestBillingJson(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=plan,plan_expires_at,lemonsqueezy_subscription_id`
  );
  // These fields are billing authority, never defaults inferred from an error envelope.
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error("Billing profile authority is unavailable.");
  const row = rows[0];
  if (!row || typeof row !== "object" || Array.isArray(row) ||
      !["free", "onetime", "pro", "agency"].includes(row.plan) ||
      !(row.plan_expires_at === null || (typeof row.plan_expires_at === "string" && Number.isFinite(Date.parse(row.plan_expires_at)))) ||
      !(row.lemonsqueezy_subscription_id === null || (typeof row.lemonsqueezy_subscription_id === "string" && row.lemonsqueezy_subscription_id.length > 0 && row.lemonsqueezy_subscription_id.length <= 256))) {
    throw new Error("Billing profile authority is invalid.");
  }
  return { plan: row.plan, plan_expires_at: row.plan_expires_at, lemonsqueezy_subscription_id: row.lemonsqueezy_subscription_id };
}

async function patchProfile(userId: string, fields: Record<string, unknown>, eventId: string, expected: Profile | null) {
  if (!expected) throw new Error("Billing profile is missing.");
  const applied = await applyBillingEvent({ eventId, userId, expected, patch: fields });
  console.info(applied ? "[ls-webhook] mutation committed" : "[ls-webhook] exact replay ignored");
}

async function handleOrderCreated(userId: string, attrs: Record<string, unknown>, eventId: string) {
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
  await patchProfile(userId, { plan: "onetime", plan_expires_at: null }, eventId, profile);
}

async function handleOrderRefunded(userId: string, attrs: Record<string, unknown>, eventId: string) {
  const firstItem = (attrs.first_order_item ?? {}) as Record<string, unknown>;
  const plan = variantToPlan(String(firstItem.variant_id ?? ""));
  if (plan !== "onetime") return; // subscription refunds arrive as subscription status changes
  // order_refunded also fires for partial refunds (status "partial_refund"); only a full refund revokes access.
  if (attrs.status !== "refunded" && attrs.refunded !== true) {
    console.info("[ls-webhook] order_refunded is partial, access kept for user:", userId);
    return;
  }

  const profile = await fetchProfile(userId);
  if (profile?.plan !== "onetime") return;
  await patchProfile(userId, { plan: "free", plan_expires_at: null }, eventId, profile);
}

async function handleSubscriptionEvent(
  eventName: string,
  userId: string,
  subscriptionId: string | null,
  attrs: Record<string, unknown>,
  eventId: string
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
  const isCurrentSubscription = !storedSubscriptionId || !subscriptionId || storedSubscriptionId === subscriptionId;

  if (ACTIVE_STATUSES.has(status)) {
    // A different subscription may only take over through its own subscription_created event, and only
    // when the stored one is no longer an active paid plan (cancelled, or the user is on free/onetime)
    // or it is an upgrade. Delayed or retried events for an older subscription are ignored, so they
    // cannot overwrite the stored subscription ID.
    if (!isCurrentSubscription) {
      const currentPlan = profile?.plan ?? "free";
      const storedStillActive = (currentPlan === "pro" || currentPlan === "agency") && !profile?.plan_expires_at;
      const canReplace =
        eventName === "subscription_created" &&
        (!storedStillActive || (PLAN_RANK[plan] ?? 0) > (PLAN_RANK[currentPlan] ?? 0));
      if (!canReplace) {
        console.info(`[ls-webhook] ${eventName} skipped: subscription ${subscriptionId} is not the current one for user ${userId}`);
        return;
      }
    }
    await patchProfile(userId, {
      plan,
      lemonsqueezy_subscription_id: subscriptionId,
      lemonsqueezy_portal_url: portalUrl,
      plan_expires_at: null,
    }, eventId, profile);
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
    }, eventId, profile);
    return;
  }

  if (INACTIVE_STATUSES.has(status)) {
    await patchProfile(userId, { plan: "free", plan_expires_at: null }, eventId, profile);
    return;
  }

  console.warn(`[ls-webhook] ${eventName}: unhandled status "${status}" user:`, userId);
}

export async function POST(req: Request) {
  let rawBody: string;
  try { rawBody = await readBoundedText(req, 262_144, req.signal); }
  catch (error) {
    return NextResponse.json({ error: error instanceof BodyTooLargeError ? "Webhook body is too large." : "Invalid webhook body." }, { status: error instanceof BodyTooLargeError ? 413 : 400 });
  }
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
    if (!event || typeof event !== "object" || Array.isArray(event)) throw new Error("Expected an object");
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

  const eventId = createHash("sha256").update(rawBody, "utf8").digest("hex");
  try {
    switch (eventName) {
      case "order_created":
        await handleOrderCreated(userId, attrs, eventId);
        break;
      case "order_refunded":
        await handleOrderRefunded(userId, attrs, eventId);
        break;
      case "subscription_created":
      case "subscription_updated":
      case "subscription_cancelled":
      case "subscription_resumed":
      case "subscription_expired":
      case "subscription_paused":
      case "subscription_unpaused":
        await handleSubscriptionEvent(eventName, userId, dataId, attrs, eventId);
        break;
      default:
        // subscription_payment_* events carry invoices; the status change arrives as subscription_updated.
        break;
    }
  } catch (err) {
    console.error("[ls-webhook] Handler failed", { code: err instanceof SyntaxError ? "invalid_response" : "processing_failed" });
    // Non-2xx makes Lemon Squeezy retry, so a transient DB failure does not lose a payment.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
