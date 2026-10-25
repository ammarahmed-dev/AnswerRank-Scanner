import { readBoundedText } from "@/lib/bounded-body";
import { getSupabaseServerUrl, getSupabaseServiceHeaders } from "@/lib/supabase-config";

export class MonitorCreationConflict extends Error {
  constructor(public reason: "limit" | "duplicate") { super("Monitor creation conflict."); }
}

type CreatedMonitor = {
  id: string; url: string; label: string | null; frequency: "weekly";
  last_scanned_at: null; created_at: string;
};

/** Server-derived cap and insert share one transaction; never retry with direct writes. */
export async function createMonitorWithLimit(input: {
  userId: string; url: string; label: string | null; limit: number;
}): Promise<CreatedMonitor> {
  const signal = AbortSignal.timeout(10_000);
  const response = await fetch(`${getSupabaseServerUrl()}/rest/v1/rpc/create_monitor_with_limit`, {
    method: "POST", headers: getSupabaseServiceHeaders(), signal,
    body: JSON.stringify({ p_user_id: input.userId, p_url: input.url, p_label: input.label, p_limit: input.limit }),
  });
  const text = await readBoundedText(response, 131_072, signal);
  if (!response.ok) {
    let code: unknown;
    try { code = JSON.parse(text)?.code; } catch { /* Do not expose database payloads. */ }
    if (code === "23505") throw new MonitorCreationConflict("duplicate");
    throw new Error("Monitor creation is unavailable.");
  }
  const data = JSON.parse(text);
  if (data && !Array.isArray(data) && data.limit_reached === true && !Object.hasOwn(data, "item")) throw new MonitorCreationConflict("limit");
  const item = data?.item;
  if (!data || data.limit_reached !== false || !item || typeof item.id !== "string" || !item.id ||
      item.url !== input.url || item.label !== input.label || item.frequency !== "weekly" ||
      item.last_scanned_at !== null || typeof item.created_at !== "string" || !Number.isFinite(Date.parse(item.created_at))) {
    throw new Error("Monitor creation returned an invalid result.");
  }
  return { id: item.id, url: item.url, label: item.label, frequency: item.frequency, last_scanned_at: null, created_at: item.created_at };
}
