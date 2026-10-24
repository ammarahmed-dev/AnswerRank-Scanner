import type { ScoringMethodology } from "@/types/index";

// Bump when check definitions/thresholds/weights, status credit or category rules change.
export const SCORING_METHOD_VERSION = "aeocheck-2026-10-24-v1";
export const OVERALL_STATUS_CREDIT = { pass: 1, warn: 0.5, fail: 0 } as const;
export const CATEGORY_STATUS_POINTS = { pass: 100, warn: 60, fail: 25 } as const;
export const MISSING_SCHEMA_CATEGORY_CAP = 45;

export function createScoringMethodology(evidence: ScoringMethodology["evidence"]): ScoringMethodology {
  return {
    version: SCORING_METHOD_VERSION,
    overall: { aggregation: "weighted", statusCredit: { ...OVERALL_STATUS_CREDIT } },
    categories: {
      aggregation: "unweighted_mean", statusPoints: { ...CATEGORY_STATUS_POINTS },
      missingSchemaCap: MISSING_SCHEMA_CATEGORY_CAP, performance: "measured_only",
    },
    unverifiedHandling: "warning_credit",
    evidence: { ...evidence },
  };
}
