import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";

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
      body = (await req.json()) as { plan?: unknown };
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
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

    const res = await fetch(LS_API, {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[checkout] Lemon Squeezy error:", res.status, detail);
      return NextResponse.json({ error: "Failed to create checkout." }, { status: 500 });
    }

    const data = (await res.json()) as { data?: { attributes?: { url?: string } } };
    const checkoutUrl = data.data?.attributes?.url;
    if (!checkoutUrl) {
      console.error("[checkout] No URL in LS response");
      return NextResponse.json({ error: "Failed to create checkout." }, { status: 500 });
    }

    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    console.error("[checkout] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
