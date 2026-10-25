import { readBoundedText } from "@/lib/bounded-body";
import { getSupabaseServerUrl, getSupabaseServiceHeaders } from "@/lib/supabase-config";

export async function applyBillingEvent(input: {
  eventId: string; userId: string;
  expected: { plan: string; plan_expires_at: string | null; lemonsqueezy_subscription_id: string | null };
  patch: Record<string, unknown>;
}): Promise<boolean> {
  const signal = AbortSignal.timeout(10_000);
  const response = await fetch(`${getSupabaseServerUrl()}/rest/v1/rpc/apply_billing_event`, {
    method: "POST", headers: getSupabaseServiceHeaders(), signal,
    body: JSON.stringify({ p_event_id: input.eventId, p_user_id: input.userId, p_expected: input.expected, p_patch: input.patch }),
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("Billing event persistence is unavailable.");
  }
  const result: unknown = JSON.parse(await readBoundedText(response, 16_384, signal));
  if (typeof result !== "boolean") throw new Error("Billing event persistence returned an invalid result.");
  return result;
}
