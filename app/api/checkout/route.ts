import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { polar } from "@/lib/polar";

export const runtime = "nodejs";

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
  console.log("Polar config check:", {
    hasToken: !!process.env.POLAR_ACCESS_TOKEN,
    hasFullReportId: !!process.env.POLAR_FULL_REPORT_PRODUCT_ID,
    hasProId: !!process.env.POLAR_PRO_MONTHLY_PRODUCT_ID,
    server: process.env.NODE_ENV,
  });

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

  if (!process.env.POLAR_ACCESS_TOKEN) {
    return NextResponse.json({ error: "Polar checkout is not configured." }, { status: 500 });
  }

  const checkoutType = body.checkoutType === "pro_plan" ? "pro_plan" : "full_report";
  const productId = checkoutType === "full_report"
    ? process.env.POLAR_FULL_REPORT_PRODUCT_ID
    : process.env.POLAR_PRO_MONTHLY_PRODUCT_ID;

  if (!productId) {
    return NextResponse.json({ error: "Polar product is not configured." }, { status: 500 });
  }

  if (checkoutType === "full_report" && !body.reportId) {
    return NextResponse.json({ error: "Run a scan first, then unlock that report." }, { status: 400 });
  }

  const origin = appUrl(req);
  const safeReturnTo = typeof body.returnTo === "string" && body.returnTo.startsWith("/")
    ? body.returnTo
    : body.reportId
      ? `/report?id=${encodeURIComponent(body.reportId)}`
      : "/report";
  const returnToWithRefresh = withPaymentRefresh(safeReturnTo);
  const successUrl = checkoutType === "full_report" && body.reportId
    ? `${origin}/report?id=${encodeURIComponent(body.reportId)}&payment=1`
    : `${origin}/?payment=1`;

  try {
    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl,
      returnUrl: `${origin}${returnToWithRefresh}`,
      customerEmail: auth.user.email ?? undefined,
      externalCustomerId: auth.user.id,
      metadata: {
        checkoutType,
        reportId: body.reportId ?? "",
        reportUrl: body.reportUrl?.slice(0, 500) ?? "",
        userId: auth.user.id,
        email: auth.user.email ?? "",
      },
      customerMetadata: {
        userId: auth.user.id,
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    const err = error as {
      message?: string;
      status?: number;
      body?: unknown;
    };
    console.error("Polar checkout error:", {
      message: err?.message,
      status: err?.status,
      body: err?.body,
      full: error,
    });
    return NextResponse.json(
      {
        error: "Failed to create checkout",
        detail: err?.message ?? "Unknown error"
      },
      { status: 500 }
    );
  }
}

