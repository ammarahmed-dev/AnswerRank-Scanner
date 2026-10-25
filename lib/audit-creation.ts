import { readBoundedText } from "@/lib/bounded-body";
import { getSupabaseServerUrl, getSupabaseServiceHeaders } from "@/lib/supabase-config";

export class AuditCreationLimit extends Error {
  constructor(public window: "monthly" | "rolling") { super("Audit creation limit reached."); }
}

/** Early count checks save discovery work; this transaction is the enforcing check. */
export async function createAuditWithLimits(input: {
  userId: string; domain: string; urls: string[]; totalDiscovered: number; pageLimit: number;
  monthlyLimit: number | null; rollingLimit: number | null; windowHours: number;
}): Promise<string> {
  const signal = AbortSignal.timeout(10_000);
  const response = await fetch(`${getSupabaseServerUrl()}/rest/v1/rpc/create_audit_with_limits`, {
    method: "POST", headers: getSupabaseServiceHeaders(), signal,
    body: JSON.stringify({
      p_user_id: input.userId, p_domain: input.domain, p_urls: input.urls,
      p_total_discovered: input.totalDiscovered, p_page_limit: input.pageLimit,
      p_monthly_limit: input.monthlyLimit, p_rolling_limit: input.rollingLimit, p_window_hours: input.windowHours,
    }),
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("Audit creation is unavailable.");
  }
  const data = JSON.parse(await readBoundedText(response, 16_384, signal));
  if (data && !Array.isArray(data) && !Object.hasOwn(data,"id") &&
      (data.limit_reached === "monthly" || data.limit_reached === "rolling")) throw new AuditCreationLimit(data.limit_reached);
  if (!data || Array.isArray(data) || data.limit_reached !== null || typeof data.id !== "string" || !data.id) {
    throw new Error("Audit creation returned an invalid result.");
  }
  return data.id;
}
