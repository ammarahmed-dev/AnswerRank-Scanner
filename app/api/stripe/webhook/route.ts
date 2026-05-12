import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { updateUserPlan } from "@/lib/supabase-admin";
import { markReportUnlocked } from "@/lib/report-db";

export const runtime = "nodejs";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function verifyStripeSignature(payload: string, signature: string | null) {
  if (!webhookSecret || !signature) return false;

  const parts = Object.fromEntries(
    signature.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    })
  );
  const timestamp = parts.t;
  const signatureHash = parts.v1;
  if (!timestamp || !signatureHash) return false;

  const expected = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signatureHash);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function POST(req: Request) {
  const payload = await req.text();

  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(payload) as {
    type: string;
    data: {
      object: {
        client_reference_id?: string;
        customer_email?: string;
        id?: string;
        payment_status?: string;
        metadata?: Record<string, string>;
      };
    };
  };

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const reportId = session.metadata?.report_id;
    if (reportId && session.payment_status === "paid") {
      await markReportUnlocked(reportId, session.id ?? null);
    }

    const userId = session.metadata?.user_id || session.client_reference_id;
    const shouldUpgradePlan = session.metadata?.plan === "pro";
    if (userId && shouldUpgradePlan) {
      await updateUserPlan(userId, "pro", session.metadata?.email || session.customer_email || null);
    }
  }

  return NextResponse.json({ received: true });
}

