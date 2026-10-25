import { randomUUID } from "node:crypto";
import { readBoundedText } from "@/lib/bounded-body";
import { getSupabaseServerUrl, getSupabaseServiceHeaders } from "@/lib/supabase-config";
import type { ScanResult } from "@/types/index";

export class OnetimeReportSaveError extends Error {
  constructor() {
    super("We could not confirm this report was saved. Check your report history before starting another scan.");
    this.name = "OnetimeReportSaveError";
  }
}

/** A paid one-time scan right is consumed only with the saved report in the same transaction. */
export async function saveOnetimeReport(result: ScanResult,userId: string): Promise<ScanResult> {
  try {
  const report = { ...result, reportId: result.reportId ?? randomUUID() };
  const signal = AbortSignal.timeout(10_000);
  const response = await fetch(`${getSupabaseServerUrl()}/rest/v1/rpc/save_onetime_report`, {
    method: "POST", headers: getSupabaseServiceHeaders(), signal,
    body: JSON.stringify({ p_user_id: userId, p_report_id: report.reportId, p_report: report }),
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("One-time report storage is unavailable or the right changed. Reload your reports before retrying.");
  }
  const savedId: unknown = JSON.parse(await readBoundedText(response,16_384,signal));
  if (savedId !== report.reportId) throw new Error("One-time report storage returned an invalid receipt.");
  return report;
  } catch {
    throw new OnetimeReportSaveError();
  }
}
