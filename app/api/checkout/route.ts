import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";

export const runtime = "nodejs";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeFullReportPriceId = process.env.STRIPE_FULL_REPORT_PRICE_ID;
const stripeProMonthlyPriceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;

type CheckoutBody = {
  checkoutType?: "full_report" | "pro_plan";
  reportId?: string;
  reportUrl?: string;
  returnTo?: string;
};

function appUrl(req: Request) {
  const normalizeOrigin = (value: string | undefined | null) => {
    if (!value) return null;
    try {
      return new URL(value).origin.replace(/\/$/, "");
    } catch {
      return null;
    }
  };

  const reqOriginHeader = normalizeOrigin(req.headers.get("origin"));
  const reqOrigin = normalizeOrigin(new URL(req.url).origin);
  const envPrimary = normalizeOrigin(process.env.APP_URL) || normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  const envAlt = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  const vercelUrl = process.env.VERCEL_URL ? normalizeOrigin(`https://${process.env.VERCEL_URL}`) : null;

  const allowedOrigins = new Set(
    [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
      envPrimary,
      envAlt,
      vercelUrl,
    ].filter((value): value is string => Boolean(value))
  );

  if (reqOriginHeader && allowedOrigins.has(reqOriginHeader)) return reqOriginHeader;
  if (reqOrigin && allowedOrigins.has(reqOrigin)) return reqOrigin;
  if (envPrimary) return envPrimary;
  if (envAlt) return envAlt;
  if (vercelUrl) return vercelUrl;
  return new URL(req.url).origin.replace(/\/$/, "");
}

function withPaymentRefresh(path: string) {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("payment", "1");
  const next = params.toString();
  return next ? `${base}?${next}` : base;
}

export async function POST(req: Request) {
  let body: CheckoutBody = {};
  try {
    body = (await req.json()) as CheckoutBody;
  } catch {
    body = {};
  }

  const auth = await getAuthContext(req);

  if (!auth.user) {
    return NextResponse.json({ error: "Log in to upgrade your plan." }, { status: 401 });
  }

  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Stripe checkout is not configured." }, { status: 500 });
  }

  const checkoutType = body.checkoutType === "pro_plan" ? "pro_plan" : "full_report";

  const origin = appUrl(req);
  const safeReturnTo = typeof body.returnTo === "string" && body.returnTo.startsWith("/")
    ? body.returnTo
    : body.reportId
      ? `/report?id=${encodeURIComponent(body.reportId)}`
      : "/report";
  const returnToWithRefresh = withPaymentRefresh(safeReturnTo);
  const successUrl = `${origin}/upgrade/success?session_id={CHECKOUT_SESSION_ID}&return_to=${encodeURIComponent(returnToWithRefresh)}${body.reportId ? `&report_id=${encodeURIComponent(body.reportId)}` : ""}`;
  const cancelUrl = `${origin}/upgrade/cancel?return_to=${encodeURIComponent(returnToWithRefresh)}`;

  const params = new URLSearchParams();
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);
  params.set("client_reference_id", auth.user.id);
  params.set("customer_email", auth.user.email ?? "");
  params.set("line_items[0][quantity]", "1");
  params.set("metadata[user_id]", auth.user.id);
  params.set("metadata[email]", auth.user.email ?? "");

  if (checkoutType === "full_report") {
    if (!stripeFullReportPriceId) {
      return NextResponse.json({ error: "Full Report checkout is not configured." }, { status: 500 });
    }
    if (!body.reportId) {
      return NextResponse.json({ error: "Run a scan first, then unlock that report." }, { status: 400 });
    }
    params.set("mode", "payment");
    params.set("line_items[0][price]", stripeFullReportPriceId);
    params.set("metadata[unlock_type]", "full_report");
    params.set("metadata[plan]", "free");
    params.set("metadata[report_id]", body.reportId);
    if (body.reportUrl) params.set("metadata[report_url]", body.reportUrl.slice(0, 500));
  } else {
    if (!stripeProMonthlyPriceId) {
      return NextResponse.json({ error: "Pro plan checkout is not configured." }, { status: 500 });
    }
    params.set("mode", "subscription");
    params.set("line_items[0][price]", stripeProMonthlyPriceId);
    params.set("metadata[plan]", "pro");
    params.set("metadata[unlock_type]", "plan_upgrade");
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
