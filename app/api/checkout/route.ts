import { BodyTooLargeError, readBoundedText, readJsonObject } from "@/lib/bounded-body";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";

import { trustedCheckoutUrl } from "@/lib/checkout-url";

export const runtime = "nodejs";

const LS_API = "https://api.lemonsqueezy.com/v1/checkouts";

const PLANS = ["onetime", "pro", "agency"] as const;
type Plan = (typeof PLANS)[number];

function getVariantId(plan: Plan): string | undefined {
  if (plan === "onetime") return process.env.LEMONSQUEEZY_VARIANT_ONETIME;
  if (plan === "pro") return process.env.LEMONSQUEEZY_VARIANT_PRO;
  if (plan === "agency") return process.env.LEMONSQUEEZY_VARIANT_AGENCY;
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { plan?: unknown };
    try {
      body = await readJsonObject(req);
    } catch (error) {
      return NextResponse.json({ error: error instanceof BodyTooLargeError ? "Request body is too large." : "Invalid request body." }, { status: error instanceof BodyTooLargeError ? 413 : 400 });
    }

    const plan = typeof body.plan === "string" ? body.plan : "";
    if (!PLANS.includes(plan as Plan)) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const variantId = getVariantId(plan as Plan);
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;

    if (!storeId || !variantId || !apiKey) {
      console.error("[checkout] Missing Lemon Squeezy env vars");
      return NextResponse.json({ error: "Checkout unavailable." }, { status: 503 });
    }

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://aeocheck.co").replace(/\/$/, "");

    const payload = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: auth.user.email ?? undefined,
            custom: { user_id: auth.user.id },
          },
          product_options: {
            redirect_url: `${baseUrl}/dashboard?upgraded=1`,
          },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId } },
          variant: { data: { type: "variants", id: variantId } },
        },
      },
    };

    const controller = new AbortController();
    const signal = AbortSignal.any([req.signal, controller.signal]);
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      signal.throwIfAborted();
      const res = await fetch(LS_API, {
        method: "POST",
        redirect: "error",
        signal,
        headers: {
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        await res.body?.cancel().catch(() => undefined);
        console.error("[checkout] Provider HTTP error:", res.status);
        return NextResponse.json({ error: "Failed to create checkout." }, { status: 500 });
      }

      const data: unknown = JSON.parse(await readBoundedText(res, 65_536, signal));
      const object = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
      const attributes = object(object(object(data)?.data)?.attributes);
      const checkoutUrl = trustedCheckoutUrl(attributes?.url);
      if (!checkoutUrl) {
        console.error("[checkout] Invalid provider response");
        return NextResponse.json({ error: "Failed to create checkout." }, { status: 502 });
      }
      return NextResponse.json({ checkoutUrl });
    } catch {
      // Provider bodies/errors can contain checkout tokens or customer data.
      console.error("[checkout] Provider request failed");
      return NextResponse.json({ error: "Failed to create checkout." }, { status: 502 });
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    console.error("[checkout] Request failed");
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
