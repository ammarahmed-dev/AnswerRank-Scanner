import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseServerUrl, getSupabaseServiceHeaders } from "@/lib/supabase-config";

export const runtime = "nodejs";

const supabaseUrl = getSupabaseServerUrl();

function variantToPlan(variantId: string): string | null {
  const v = variantId.toString();
  if (v === process.env.LEMONSQUEEZY_VARIANT_ONETIME) return "onetime";
  if (v === process.env.LEMONSQUEEZY_VARIANT_PRO) return "pro";
  if (v === process.env.LEMONSQUEEZY_VARIANT_AGENCY) return "agency";
  return null;
}

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(rawBody, "utf8");
    const digest = hmac.digest("hex");
    const digestBuf = Buffer.from(digest, "hex");
    const sigBuf = Buffer.from(signature, "hex");
    if (digestBuf.length !== sigBuf.length) return false;
    return timingSafeEqual(digestBuf, sigBuf);
  } catch {
    return false;
  }
}

async function patchProfile(userId: string, fields: Record<string, unknown>) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      headers: {
        ...getSupabaseServiceHeaders(),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(fields),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[ls-webhook] patchProfile failed:", res.status, body);
  }
}

export async function POST(req: Request) {
  const raw = await req.arrayBuffer();
  const rawBody = new TextDecoder().decode(raw);
  const signature = req.headers.get("x-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    console.warn("[ls-webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    meta?: { event_name?: string; custom_data?: Record<string, unknown> };
    data?: { id?: string; attributes?: Record<string, unknown> };
  };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = event.meta?.event_name ?? "";
  const userId = String(event.meta?.custom_data?.user_id ?? "").trim();
  const attrs = event.data?.attributes ?? {};

  if (!userId) {
    console.warn("[ls-webhook] No user_id in custom_data for event:", eventName);
    return NextResponse.json({ ok: true });
  }

  try {
    if (eventName === "order_created") {
      const firstItem = (attrs.first_order_item ?? {}) as Record<string, unknown>;
      const variantId = String(firstItem.variant_id ?? "");
      const plan = variantToPlan(variantId);
      if (plan === "onetime") {
        await patchProfile(userId, { plan: "onetime", plan_expires_at: null });
        console.info("[ls-webhook] order_created → plan=onetime user:", userId);
      }
    }

    if (eventName === "subscription_created" || eventName === "subscription_updated") {
      const variantId = String(attrs.variant_id ?? "");
      const plan = variantToPlan(variantId);
      if (plan === "pro" || plan === "agency") {
        const subscriptionId = event.data?.id ?? null;
        await patchProfile(userId, {
          plan,
          lemonsqueezy_subscription_id: subscriptionId,
          plan_expires_at: null,
        });
        console.info(`[ls-webhook] ${eventName} → plan=${plan} user:`, userId);
      }
    }

    if (eventName === "subscription_cancelled") {
      const endsAt = (attrs.ends_at as string | null) ?? null;
      await patchProfile(userId, { plan_expires_at: endsAt });
      console.info("[ls-webhook] subscription_cancelled ends_at=%s user:", endsAt, userId);
    }
  } catch (err) {
    console.error("[ls-webhook] Handler error:", eventName, err);
  }

  // Always 200 so LS does not retry
  return NextResponse.json({ ok: true });
}
