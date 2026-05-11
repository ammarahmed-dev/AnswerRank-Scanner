import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { markReportUnlocked } from "@/lib/report-db";

export const runtime = "nodejs";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

type ConfirmBody = {
  sessionId?: string;
  reportId?: string;
};

export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
  }

  let body: ConfirmBody;
  try {
    body = (await req.json()) as ConfirmBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session ID." }, { status: 400 });
  }

  const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
    },
    cache: "no-store",
  });

  if (!stripeRes.ok) {
    const details = await stripeRes.text().catch(() => "");
    return NextResponse.json({ error: "Could not verify checkout session.", details }, { status: 502 });
  }

  const session = (await stripeRes.json()) as {
    id: string;
    status?: string;
    payment_status?: string;
    metadata?: Record<string, string>;
  };

  const reportId = session.metadata?.report_id || body.reportId;
  const isPaid = session.payment_status === "paid";

  if (!isPaid || !reportId) {
    return NextResponse.json({
      confirmed: false,
      unlocked: false,
      reportId: reportId ?? null,
      paymentStatus: session.payment_status ?? null,
      status: session.status ?? null,
    });
  }

  const unlocked = await markReportUnlocked(reportId, session.id);
  return NextResponse.json({
    confirmed: true,
    unlocked,
    reportId,
  });
}
