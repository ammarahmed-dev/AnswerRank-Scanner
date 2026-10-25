import { readBoundedText } from "@/lib/bounded-body";
import { getSupabaseServiceHeaders } from "@/lib/supabase-config";

/** Keep the database deadline active through body consumption, before scan work starts. */
export async function loadScanRows(url: string, maxBytes: number, caller: AbortSignal): Promise<unknown[]> {
  const signal = AbortSignal.any([caller, AbortSignal.timeout(10_000)]);
  signal.throwIfAborted();
  const response = await fetch(url, { headers: getSupabaseServiceHeaders(), cache: "no-store", signal });
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("Scan resource is unavailable.");
  }
  const rows: unknown = JSON.parse(await readBoundedText(response, maxBytes, signal));
  if (!Array.isArray(rows)) throw new Error("Invalid scan resource response.");
  return rows;
}
