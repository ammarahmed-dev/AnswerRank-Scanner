import { NextRequest, NextResponse } from "next/server";
import { POLAR_BASE_URL } from "@/lib/polar";
import { getAuthContext } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      checkoutType: "full_report" | "pro_plan";
      reportId?: string;
      returnTo?: string;
    };

    const ALLOWED_CHECKOUT_TYPES = ["full_report", "pro_plan"] as const;
    if (!ALLOWED_CHECKOUT_TYPES.includes(body.checkoutType)) {
      return NextResponse.json({ error: "Invalid checkout type" }, { status: 400 });
    }

    const authContext = await getAuthContext(req);
    if (!authContext.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const userEmail = authContext.user?.email;

    const fullReportProductId = process.env.POLAR_FULL_REPORT_PRODUCT_ID;
    const proMonthlyProductId = process.env.POLAR_PRO_MONTHLY_PRODUCT_ID;
    if (!fullReportProductId || !proMonthlyProductId) {
      console.error("[checkout] Polar product ID env vars are not configured");
      return NextResponse.json({ error: "Checkout unavailable" }, { status: 503 });
    }
    const productId = body.checkoutType === "full_report" ? fullReportProductId : proMonthlyProductId;

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.aeocheck.co").replace(/\/$/, "");
    const successUrl = body.checkoutType === "full_report" && body.reportId
      ? `${baseUrl}/report?id=${body.reportId}&payment=1`
      : `${baseUrl}/?payment=1`;

    const metadata = {
      checkoutType: body.checkoutType,
      ...(body.reportId ? { reportId: body.reportId } : {}),
      ...(authContext.user?.id ? { userId: authContext.user.id } : {}),
    };

    const requestBody = body.checkoutType === "pro_plan"
      ? {
          products: [productId],
          success_url: successUrl,
          ...(userEmail ? { customer_email: userEmail } : {}),
          metadata,
        }
      : {
          product_id: productId,
          success_url: successUrl,
          ...(userEmail ? { customer_email: userEmail } : {}),
          metadata,
        };

    const response = await fetch(`${POLAR_BASE_URL}/v1/checkouts/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    if (!response.ok) {
      console.error("[checkout] Polar API error:", response.status, responseText);
      return NextResponse.json(
        { error: "Failed to create checkout" },
        { status: 500 }
      );
    }

    const data = JSON.parse(responseText) as { url: string };
    return NextResponse.json({ url: data.url });

  } catch (error) {
    const err = error as { message?: string };
    console.error("Checkout error:", err?.message, error);
    return NextResponse.json(
      { error: "Failed to create checkout" },
      { status: 500 }
    );
  }
}
