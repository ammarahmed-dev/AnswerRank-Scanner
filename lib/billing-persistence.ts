import { requestBillingJson } from "@/lib/billing-storage";

export async function applyBillingEvent(input: {
  eventId: string; userId: string;
  expected: { plan: string; plan_expires_at: string | null; lemonsqueezy_subscription_id: string | null };
  patch: Record<string, unknown>;
}): Promise<boolean> {
  const result = await requestBillingJson("/rest/v1/rpc/apply_billing_event", {
    method: "POST",
    body: JSON.stringify({ p_event_id: input.eventId, p_user_id: input.userId, p_expected: input.expected, p_patch: input.patch }),
  });
  if (typeof result !== "boolean") throw new Error("Billing event persistence returned an invalid result.");
  return result;
}
