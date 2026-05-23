import { NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { markReportUnlocked } from "@/lib/report-db";
import { updateUserPlan } from "@/lib/supabase-admin";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";

// Process-level dedup guard: survives within one server instance lifespan.
const processedEventIds = new Set<string>();
const PROCESSED_IDS_MAX = 2000;

const supabaseUrl = getSupabaseServerUrl();

async function isEventAlreadyProcessed(eventId: string): Promise<boolean> {
  if (processedEventIds.has(eventId)) return true;
  if (!hasSupabaseConfig()) return false;

  try {
    const params = new URLSearchParams({ event_id: `eq.${eventId}`, select: "event_id", limit: "1" });
    const res = await fetch(`${supabaseUrl}/rest/v1/webhook_events?${params.toString()}`, {
      headers: getSupabaseServiceHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const rows = (await res.json()) as Array<unknown>;
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function markEventProcessed(eventId: string): Promise<void> {
  if (processedEventIds.size >= PROCESSED_IDS_MAX) {
    const oldest = processedEventIds.values().next().value;
    if (oldest !== undefined) processedEventIds.delete(oldest);
  }
  processedEventIds.add(eventId);

  if (!hasSupabaseConfig()) return;
  try {
    await fetch(`${supabaseUrl}/rest/v1/webhook_events`, {
      method: "POST",
      headers: { ...getSupabaseServiceHeaders(), Prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify({ event_id: eventId }),
    });
  } catch {
    // Non-fatal: process-level Set is the fallback.
  }
}

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

  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] POLAR_WEBHOOK_SECRET is not configured");
    return new NextResponse("Webhook not configured", { status: 503 });
  }

  let event: ReturnType<typeof validateEvent>;
  try {
    event = validateEvent(body, headers, webhookSecret);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    throw error;
  }

  const eventId = headers["webhook-id"];
  if (eventId && await isEventAlreadyProcessed(eventId)) {
    return NextResponse.json({ received: true, duplicate: true });
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

  if (eventId) await markEventProcessed(eventId);
  return NextResponse.json({ received: true });
}
