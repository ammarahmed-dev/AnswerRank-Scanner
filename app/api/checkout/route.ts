import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";

export const runtime = "nodejs";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeProPriceId = process.env.STRIPE_PRO_PRICE_ID;
const stripeCheckoutMode = process.env.STRIPE_CHECKOUT_MODE === "subscription" ? "subscription" : "payment";

function appUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(req.url).origin;
}

export async function POST(req: Request) {
  const auth = await getAuthContext(req);

  if (!auth.user) {
    return NextResponse.json({ error: "Log in to upgrade your plan." }, { status: 401 });
  }

  if (!stripeSecretKey || !stripeProPriceId) {
    return NextResponse.json({ error: "Stripe checkout is not configured." }, { status: 500 });
  }

  const origin = appUrl(req);
  const params = new URLSearchParams({
    mode: stripeCheckoutMode,
    success_url: `${origin}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/upgrade/cancel`,
    client_reference_id: auth.user.id,
    customer_email: auth.user.email ?? "",
    "line_items[0][price]": stripeProPriceId,
    "line_items[0][quantity]": "1",
    "metadata[user_id]": auth.user.id,
    "metadata[email]": auth.user.email ?? "",
    "metadata[plan]": "pro",
  });

  if (stripeCheckoutMode === "subscription") {
    params.set("subscription_data[metadata][user_id]", auth.user.id);
    params.set("subscription_data[metadata][plan]", "pro");
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = (await res.json()) as { url?: string; error?: { message?: string } };

  if (!res.ok || !data.url) {
    return NextResponse.json({ error: data.error?.message ?? "Could not start checkout." }, { status: 502 });
  }

  return NextResponse.json({ url: data.url });
}
