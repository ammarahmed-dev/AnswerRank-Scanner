import type { CheckResult, PreviousScanSummary } from "@/types/index";

const RANK = { fail: 0, warn: 1, pass: 2 } as const;

export type ReportChange = { id: string; label: string; from: CheckResult["status"]; to: CheckResult["status"] };

export type ReportDiff = {
  scoreDelta: number;
  previousScore: number;
  previousScannedAt: string;
  improved: ReportChange[];
  regressed: ReportChange[];
  /** Checks that exist now but did not exist in the previous scan. */
  added: number;
  unchanged: number;
};

/** Compares a report's checks with the stored summary of the previous scan (only checks present in both). */
export function diffReports(score: number, checks: CheckResult[], previous: PreviousScanSummary): ReportDiff {
  const before = new Map(previous.checks.map((c) => [c.id, c]));
  const improved: ReportChange[] = [];
  const regressed: ReportChange[] = [];
  let unchanged = 0;
  let added = 0;

  for (const check of checks) {
    const old = before.get(check.id);
    if (!old) { added++; continue; }
    if (RANK[check.status] > RANK[old.status]) improved.push({ id: check.id, label: check.label, from: old.status, to: check.status });
    else if (RANK[check.status] < RANK[old.status]) regressed.push({ id: check.id, label: check.label, from: old.status, to: check.status });
    else unchanged++;
  }

  return { scoreDelta: score - previous.score, previousScore: previous.score, previousScannedAt: previous.scannedAt, improved, regressed, added, unchanged };
}
