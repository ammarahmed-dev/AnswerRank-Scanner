import { readBoundedText } from "@/lib/bounded-body";
import { getSupabaseServerUrl, getSupabaseServiceHeaders } from "@/lib/supabase-config";

export type SavedMonitorSnapshot = { id: string; score: number; scanned_at: string };

/** Snapshot creation and schedule advancement must succeed in one transaction. */
export async function saveMonitorSnapshot(input: {
  monitorId: string; userId: string; score: number;
  categoryScores: Record<string, number>; methodologyVersion?: string;
}): Promise<SavedMonitorSnapshot> {
  const signal = AbortSignal.timeout(10_000);
  const response = await fetch(`${getSupabaseServerUrl()}/rest/v1/rpc/save_monitor_snapshot`, {
    method: "POST", headers: getSupabaseServiceHeaders(), signal,
    body: JSON.stringify({
      p_monitor_id: input.monitorId, p_user_id: input.userId, p_score: input.score,
      p_category_scores: input.categoryScores, p_methodology_version: input.methodologyVersion ?? null,
    }),
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("Monitor persistence is unavailable.");
  }
  const rows: unknown = JSON.parse(await readBoundedText(response, 65_536, signal));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error("Monitor persistence returned no snapshot.");
  const row = rows[0];
  if (!row || typeof row.id !== "string" || !row.id || row.score !== input.score ||
      typeof row.scanned_at !== "string" || !Number.isFinite(Date.parse(row.scanned_at))) {
    throw new Error("Monitor persistence returned an invalid snapshot.");
  }
  return { id: row.id, score: row.score, scanned_at: row.scanned_at };
}
