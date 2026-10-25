import { readBoundedText } from "@/lib/bounded-body";
import { getSupabaseServerUrl, getSupabaseServiceHeaders } from "@/lib/supabase-config";

type PageResult = { url: string; score: number; status?: "done" | "error" };
export type SavedAuditProgress = { scannedPages: number; totalPages: number; aggregateScore: number | null; complete: boolean };
export class AuditSaveConflict extends Error {
  constructor(public status: 400 | 404 | 409) { super("Audit changed before the page could be saved. Reload the audit."); }
}

/** Append to the current locked audit, never replace it with the caller's stale snapshot. */
export async function saveAuditPageResult(auditId: string, userId: string, pageResult: PageResult): Promise<SavedAuditProgress> {
  const signal = AbortSignal.timeout(10_000);
  const response = await fetch(`${getSupabaseServerUrl()}/rest/v1/rpc/save_audit_page_result`, {
    method: "POST", headers: getSupabaseServiceHeaders(), signal,
    body: JSON.stringify({ p_audit_id: auditId, p_user_id: userId, p_page_result: pageResult }),
  });
  const text = await readBoundedText(response, 16_384, signal);
  if (!response.ok) {
    let code: unknown;
    try { code = JSON.parse(text)?.code; } catch { /* Never expose database error payloads. */ }
    if (code === "23505" || code === "55000") throw new AuditSaveConflict(409);
    if (code === "P0002") throw new AuditSaveConflict(404);
    if (code === "22023") throw new AuditSaveConflict(400);
    throw new Error("Audit persistence is unavailable.");
  }
  const rows: unknown = JSON.parse(text);
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error("Audit persistence returned no progress.");
  const row = rows[0];
  if (!row || !Number.isInteger(row.scanned_pages) || !Number.isInteger(row.total_pages) ||
      row.scanned_pages < 1 || row.total_pages < row.scanned_pages ||
      typeof row.complete !== "boolean" || row.complete !== (row.scanned_pages === row.total_pages) ||
      !(row.aggregate_score === null || (Number.isInteger(row.aggregate_score) && row.aggregate_score >= 0 && row.aggregate_score <= 100))) {
    throw new Error("Audit persistence returned invalid progress.");
  }
  return { scannedPages: row.scanned_pages, totalPages: row.total_pages, aggregateScore: row.aggregate_score, complete: row.complete };
}
