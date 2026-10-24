import { getScoringComparison, type ScoringComparison } from "@/lib/scoring-comparison";
import type { CheckResult, PreviousScanSummary } from "@/types/index";

const RANK = { fail: 0, warn: 1, pass: 2 } as const;

export type ReportChange = { id: string; label: string; from: CheckResult["status"]; to: CheckResult["status"] };

export type ReportDiff = {
  comparison: ScoringComparison;
  scoreDelta: number | null;
  previousScore: number;
  previousScannedAt: string;
  improved: ReportChange[];
  regressed: ReportChange[];
  /** Checks that exist now but did not exist in the previous scan. */
  added: number;
  unchanged: number;
};

/** Interpret score/status changes only when both reports record the same scoring method. */
export function diffReports(score: number, checks: CheckResult[], previous: PreviousScanSummary, methodologyVersion?: string): ReportDiff {
  const comparison = getScoringComparison(methodologyVersion, previous.methodologyVersion);
  if (comparison !== "same_method") {
    return { comparison, scoreDelta: null, previousScore: previous.score, previousScannedAt: previous.scannedAt, improved: [], regressed: [], added: 0, unchanged: 0 };
  }
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

  return { comparison, scoreDelta: score - previous.score, previousScore: previous.score, previousScannedAt: previous.scannedAt, improved, regressed, added, unchanged };
}
