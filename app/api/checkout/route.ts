import { NextRequest, NextResponse } from "next/server";
import { POLAR_BASE_URL } from "@/lib/polar";
import { getAuthContext } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  console.log("Polar config:", {
    hasToken: !!process.env.POLAR_ACCESS_TOKEN,
    baseUrl: POLAR_BASE_URL,
    fullReportId: process.env.POLAR_FULL_REPORT_PRODUCT_ID,
    proId: process.env.POLAR_PRO_MONTHLY_PRODUCT_ID,
  });

  try {
    const body = await req.json() as {
      checkoutType: "full_report" | "pro_plan";
      reportId?: string;
      returnTo?: string;
    };

    const authContext = await getAuthContext(req);
    const userEmail = authContext.user?.email;

    const productId = body.checkoutType === "full_report"
      ? process.env.POLAR_FULL_REPORT_PRODUCT_ID!
      : process.env.POLAR_PRO_MONTHLY_PRODUCT_ID!;

    const successUrl = body.checkoutType === "full_report" && body.reportId
      ? `${process.env.NEXT_PUBLIC_APP_URL}/report?id=${body.reportId}&payment=1`
      : `${process.env.NEXT_PUBLIC_APP_URL}/?payment=1`;

    const requestBody = {
      product_id: productId,
      success_url: successUrl,
      ...(userEmail ? { customer_email: userEmail } : {}),
      metadata: {
        checkoutType: body.checkoutType,
        reportId: body.reportId ?? "",
        userId: authContext.user?.id ?? "",
      },
    };

    console.log("Polar request:", {
      url: `${POLAR_BASE_URL}/v1/checkouts/`,
      productId,
      successUrl,
    });

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
    console.log("Polar response:", response.status, responseText);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to create checkout", detail: responseText },
        { status: 500 }
      );
    }

    const data = JSON.parse(responseText) as { url: string };
    return NextResponse.json({ url: data.url });

  } catch (error) {
    const err = error as { message?: string };
    console.error("Checkout error:", err?.message, error);
    return NextResponse.json(
      { error: "Failed to create checkout", detail: err?.message },
      { status: 500 }
    );
  }
}
