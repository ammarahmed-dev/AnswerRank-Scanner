import { NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { markReportUnlocked } from "@/lib/report-db";
import { updateUserPlan } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function metadataOf(data: unknown) {
  const metadata = (data as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== "object") return {};
  return metadata as Record<string, unknown>;
}

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

function dataString(data: unknown, key: string) {
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export async function POST(req: Request) {
  const body = await req.text();
  const headers = {
    "webhook-id": req.headers.get("webhook-id") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? "",
  };

  let event: ReturnType<typeof validateEvent>;
  try {
    event = validateEvent(body, headers, process.env.POLAR_WEBHOOK_SECRET!);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    throw error;
  }

  try {
    switch (event.type) {
      case "order.paid": {
        const order = event.data;
        const metadata = metadataOf(order);
        const checkoutType = metadataString(metadata, "checkoutType");
        const reportId = metadataString(metadata, "reportId");

        if (checkoutType === "full_report" && reportId) {
          await markReportUnlocked(reportId, dataString(order, "id") || null);
        }
        break;
      }

      case "subscription.active": {
        const subscription = event.data;
        const metadata = metadataOf(subscription);
        const userId = metadataString(metadata, "userId");
        const email = dataString(subscription, "customerEmail") || metadataString(metadata, "email") || null;

        if (userId) {
          await updateUserPlan(userId, "pro", email);
        }
        break;
      }

      case "subscription.revoked":
      case "subscription.canceled": {
        const subscription = event.data;
        const metadata = metadataOf(subscription);
        const userId = metadataString(metadata, "userId");
        const email = dataString(subscription, "customerEmail") || metadataString(metadata, "email") || null;

        if (userId) {
          await updateUserPlan(userId, "free", email);
        }
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error("Polar webhook handler error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
